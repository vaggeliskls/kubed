import { Command, Option } from "commander";

import { cliOutput, executor } from "../../shared/cli";
import { actionRunner } from "../../shared/errors";
import { BundleFilesEnum } from "../bundle";
import * as deployer from "../deployer";
import * as system from "../system";

const k3dOptions = {
  cluster: {
    port: 80,
    gpu: false,
  },
  registry: {
    name: "registry.localhost",
    port: 12345,
  },
  offline: {
    images: [
      { image: "ghcr.io/vaggeliskls/k3s:v1.27.4-k3s1", file: "rancher-k3s.tar", load: true },
      {
        image: "ghcr.io/vaggeliskls/k3s:v1.27.4-k3s1-cuda",
        file: "rancher-k3s-cuda.tar",
        load: true,
      },
      { image: "ghcr.io/k3d-io/k3d-proxy:5.6.0", file: "k3d-proxy.tar", load: true },
      { image: "ghcr.io/k3d-io/k3d-tools:5.6.0", file: "k3d-tools.tar", load: true },
      {
        image: "nvcr.io/nvidia/k8s-device-plugin:v0.14.3",
        file: "k8s-gpu-device-plugin.tar",
        load: false,
      },
      { image: "registry:2", file: "docker-registry.tar", load: true },
    ],
    files: [
      {
        file: "https://github.com/k3s-io/k3s/releases/download/v1.27.4+k3s1/k3s-airgap-images-amd64.tar",
        name: "k3s-airgap-images-amd64.tar",
        load: false,
      },
    ],
  },
};
// https://github.com/k3s-io/k3s/releases/download/v1.27.9%2Bk3s1/k3s-airgap-images-arm64.tar
export function k3dCli(): Command {
  // DEPLOY
  const k3dCli = new Command();
  k3dCli.name("cluster").description("K3D kubernetes cluster");

  k3dCli
    .command("download-images")
    .addOption(new Option("-o, --output <text>", "Change export folder"))
    .action(
      actionRunner(async (options: any) => {
        const exportPath = options?.output ?? `${BundleFilesEnum.S3DefaultPath}/k3d`;
        system.deletePath(exportPath);
        system.createFolder(exportPath);
        const downloadTasks = [];
        // Download images
        for (const el of k3dOptions.offline.images) {
          downloadTasks.push({
            name: el.file,
            asyncFunc: () =>
              executor.runCommandAsync(
                `skopeo copy --insecure-policy --override-os linux --override-arch amd64 docker://${el.image} docker-archive:${exportPath}/${el.file}:${el.image}`
              ),
          });
        }
        // Download files
        for (const el of k3dOptions.offline.files) {
          downloadTasks.push({
            name: el.name,
            asyncFunc: () => system.downloadFile(el.file, `${exportPath}/${el.name}`),
          });
        }
        await deployer.runTasks(downloadTasks, "Download K3D required images as tars");
        cliOutput.success({ title: "The download of k3d offline images completed" });
      })
    );

  k3dCli.command("load-images").action(
    actionRunner(async () => {
      const imageExtractPath = `${BundleFilesEnum.S3DefaultPath}/k3d`;

      if (!system.pathExists(imageExtractPath)) {
        cliOutput.error({
          title: "The k3d images doesn't exist locally",
          bodyLines: ["Try download the images"],
        });
        system.terminateApp();
      }
      await system.extractTarFile(`${BundleFilesEnum.S3DefaultPath}/k3d.tar`, imageExtractPath, {
        silent: false,
      });
      // Get the k3d tars to be loaded
      let imageTars = system.getFilesInDir(imageExtractPath);
      const imagesNameToLoad = k3dOptions.offline.images
        .filter((obj: any) => obj.load)
        .map((obj: any) => obj.file);
      imageTars = imageTars.filter((file: string) => imagesNameToLoad.includes(file));
      let index = 1;
      for (const imageTar of imageTars) {
        cliOutput.log({ title: `Import (${index}/${imageTars.length}) -> ${imageTar}` });
        await executor.runCommandAsync(`docker load -i ${imageExtractPath}/${imageTar}`, {
          silent: false,
        });
        index++;
      }
      cliOutput.success({ title: "The load of k3d offline images completed" });
    })
  );

  k3dCli
    .command("create")
    .option("-n, --name <text>", "Cluster name", "k8s-local-cluster")
    .option("-g, --gpu", "Enable gpu cluster", false)
    .option("-o, --offline", "Offline mode", false)
    .action(
      actionRunner(async (options: any) => {
        const clusterName = options.name;
        const k3dImage = options?.gpu
          ? k3dOptions.offline.images[1].image
          : k3dOptions.offline.images[0].image;
        let k3dArguments = "";
        try {
          await executor.runCommandAsync(
            `k3d registry create ${k3dOptions.registry.name} --port ${k3dOptions.registry.port}`,
            { stdio: "inherit" }
          );
        } catch (err) {
          cliOutput.warn({
            title: "Registry already installed",
          });
        }
        k3dArguments += ` --image ${k3dImage} --registry-use k3d-${k3dOptions.registry.name}:${k3dOptions.registry.port} `;
        k3dArguments += options.gpu ? " --gpus=all " : "";
        // const dockerArgs = `--k3s-arg "--docker@server:*"  --network host --k3s-arg "--container-runtime-endpoint=/var/run/k@server:*"`
        // https://docs.k3s.io/cli/server#k3s-server-cli-help
        await executor.runCommandAsync(
          `k3d cluster create "${clusterName}" --k3s-arg "−−disable=metrics-server@server:*" --k3s-arg "--disable=traefik@server:*" ${k3dArguments}`,
          { stdio: "inherit" }
        );
        await executor.runCommandAsync(
          `k3d cluster edit "${clusterName}" --port-add ${k3dOptions.cluster.port}:80@loadbalancer`,
          { stdio: "inherit" }
        );

        if (options.offline) {
          await executor.runCommandAsync(
            `k3d image import --cluster "${clusterName}" ${BundleFilesEnum.S3DefaultPath}/k3d/k3s-airgap-images-amd64.tar`,
            { stdio: "inherit" }
          );
          await executor.runCommandAsync(
            `k3d image import --cluster "${clusterName}" ${BundleFilesEnum.S3DefaultPath}/k3d/k8s-gpu-device-plugin.tar`,
            { stdio: "inherit" }
          );
        }
        cliOutput.success({ title: "The creation of K3D cluster completed" });
      })
    );

  k3dCli
    .command("delete")
    .option("-n, --name <text>", "Cluster name", "k8s-local-cluster")
    .option("-a, --all", "Delete all clusters", false)
    .option("-d, --registry", "Delete the connected registry", false)
    .action(
      actionRunner(async (options: any) => {
        if (options?.registry) {
          try {
            await executor.runCommandAsync(`k3d node delete k3d-${k3dOptions.registry.name}`, {
              stdio: "inherit",
            });
          } catch (err) {
            cliOutput.warn({ title: `cannot delete node k3d-${k3dOptions.registry.name}` });
          }
          try {
            await executor.runCommandAsync(`k3d registry delete k3d-${k3dOptions.registry.name}`, {
              stdio: "inherit",
            });
          } catch (err) {
            cliOutput.warn({ title: `cannot delete registry k3d-${k3dOptions.registry.name}` });
          }
        }
        if (options?.all) {
          await executor.runCommandAsync("k3d cluster delete --all", { stdio: "inherit" });
        } else {
          await executor.runCommandAsync(`k3d cluster delete ${options.name}`, {
            stdio: "inherit",
          });
        }
        cliOutput.success({ title: "The deletion of K3D cluster completed" });
      })
    );

  k3dCli
    .command("start")
    .option("-n, --name <text>", "Cluster name", "k8s-local-cluster")
    .action(
      actionRunner(async (options: any) => {
        try {
          await executor.runCommandAsync(`k3d cluster start ${options.name}`, {
            stdio: "inherit",
          });
        } catch (err) {
          cliOutput.warn({ title: `cannot start ${options.name}` });
        }
        cliOutput.success({ title: `The start of ${options.name} K3D cluster completed` });
      })
    );

  k3dCli
    .command("stop")
    .option("-n, --name <text>", "Cluster name", "k8s-local-cluster")
    .action(
      actionRunner(async (options: any) => {
        try {
          await executor.runCommandAsync(`k3d cluster stop ${options.name}`, {
            stdio: "inherit",
          });
        } catch (err) {
          cliOutput.warn({ title: `cannot stop ${options.name}` });
        }
        cliOutput.success({ title: `The stop of ${options.name} K3D cluster completed` });
      })
    );

  k3dCli.command("status").action(
    actionRunner(async () => {
      await executor.runCommandAsync("kubectl get pods --all-namespaces", { stdio: "inherit" });
    })
  );

  k3dCli.command("node-list").action(
    actionRunner(async () => {
      await executor.runCommandAsync("k3d node list", { stdio: "inherit" });
    })
  );

  k3dCli.command("cluster-list").action(
    actionRunner(async () => {
      await executor.runCommandAsync("k3d cluster list", { stdio: "inherit" });
    })
  );
  return k3dCli;
}
