import { cliOutput, executor } from "../../shared/cli";
import { DockerImageDetails } from "../deployer";
import * as deployer from "../deployer";
import * as k8s from "../kubernetes";
import * as system from "../system";

export enum BundleFilesEnum {
  S3DefaultPath = "./assets/s3-files",
}

export async function getChartImagesDetails(
  envData: deployer.IDeployer,
  deployerValues: deployer.IDict,
  options?: {
    category?: "components" | "k8s-services";
    output?: string;
  }
): Promise<DockerImageDetails[]> {
  cliOutput.log({ title: `Export ${options?.category ?? "all"} charts images` });
  const registry = deployerValues["REGISTRY"];
  const charts: deployer.IChartsData[] = await deployer.getLocalChartsValues(envData, {
    deployerValues,
  });
  let imagesList = await k8s.exportChartsImages(charts);
  // Filter by registry name
  if (options?.category) {
    imagesList = imagesList.filter((image: string) =>
      options?.category === "components" ? image.includes(registry) : !image.includes(registry)
    );
  }
  cliOutput.log({
    title: `Extracted Images (${imagesList.length}):`,
    bodyLines: [...imagesList],
  });
  if (options?.output) {
    system.writeToFile(options?.output, imagesList.toString(), "text");
  }
  return imagesList.map((image: string) => system.dockerImageProcess(image));
}

export async function dockerOciArchiveExport(
  imagesDetails: DockerImageDetails[],
  deployerValues: deployer.IDict,
  options?: {
    awsConfigure?: boolean;
    ecrLogin?: boolean;
    dockerLogin?: boolean;
    debug?: boolean;
    category?: "components" | "k8s-services";
    upload?: boolean;
    output?: string;
  }
): Promise<void> {
  const registry = deployerValues["REGISTRY"];
  const exportPath = options?.output ?? `${BundleFilesEnum.S3DefaultPath}/bundle`;
  system.deletePath(exportPath);
  system.createFolder(exportPath);
  const blobPath = `${exportPath}/images/blobs`;
  system.createFolder(blobPath);
  if (registry && options?.awsConfigure) {
    cliOutput.log({ title: "Authenticate source registry" });
    await executor.runCommandAsync("aws configure", { stdio: "inherit" });
  }
  if (registry && options?.ecrLogin) {
    const token = await executor.runCommandAsync("aws ecr get-login-password --region eu-west-2");
    await executor.runCommandAsync(`skopeo login --username AWS --password-stdin ${registry}`, {
      input: token,
      silent: false,
    });
  }
  if (registry && options?.dockerLogin) {
    await executor.runCommandAsync(`skopeo login ${registry}`, {
      silent: false,
    });
  }
  let index = 1;
  for (const imageDetails of imagesDetails) {
    cliOutput.success({
      title: `Download (${index}/${imagesDetails.length}) -> ${imageDetails.image}`,
    });
    const ociPath = `${exportPath}/images/${imageDetails.repository}${
      imageDetails.tag ? "-" + imageDetails.tag : ""
    }`;
    system.createFolder(ociPath);
    await executor.runCommandAsync(
      `skopeo copy --insecure-policy --dest-tls-verify=false --override-os linux --override-arch amd64 --retry-times=3 --dest-shared-blob-dir ${blobPath} docker://${imageDetails.image} oci:${ociPath}`,
      { silent: false }
    );
    index++;
  }
  cliOutput.log({ title: "Create bundle json file" });
  system.writeToFile(`${exportPath}/bundle.json`, { images: imagesDetails }, "json");
  cliOutput.success({ title: `The preparation of ${options?.category} images finished` });
}

export async function importDockerOciBundle(
  imagesDetails: DockerImageDetails[],
  deployerValues: deployer.IDict,
  dest: string,
  category: "components" | "k8s-services",
  options?: { auth?: boolean; destType?: "docker-daemon" | "docker" | "containers-storage" }
): Promise<void> {
  const exportPath = `${BundleFilesEnum.S3DefaultPath}/bundle`;
  const registry = deployerValues["REGISTRY"];
  if (!system.pathExists(exportPath)) {
    cliOutput.error({ title: "There is not local oci images folder. Try download." });
    system.terminateApp();
  }

  if (options?.auth) {
    cliOutput.log({ title: "Provide the credentials of the registry" });
    await executor.runCommandAsync(`skopeo login ${dest}`, { stdio: "inherit" });
  }

  const skopeoDest = options?.destType ?? "docker";
  let index = 1;
  for (const imageDetails of imagesDetails) {
    const ociPath = `${exportPath}/images/${imageDetails.repository}${
      imageDetails.tag ? "-" + imageDetails.tag : ""
    }`;
    const destImageTag = imageDetails.tag ? `:${imageDetails.tag}` : "";
    const destImageUrl = `${dest ?? registry}/${imageDetails.repository}${destImageTag}`;
    cliOutput.success({
      title: `Import (${index}/${imagesDetails.length}) -> ${destImageUrl}`,
    });
    await executor.runCommandAsync(
      `skopeo copy --src-shared-blob-dir ${exportPath}/images/blobs --insecure-policy --dest-tls-verify=false --retry-times=3 oci:${ociPath} ${skopeoDest}://${destImageUrl}`,
      { silent: false }
    );
    index++;
  }
  cliOutput.success({ title: `The ${category} imports import completed` });
}
