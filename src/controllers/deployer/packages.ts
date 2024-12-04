import Table from "cli-table3";

import { cliOutput, executor } from "../../shared/cli";
import * as deployer from "../deployer";
import * as system from "../system";

const packagesFolder = "./assets/packages";

export async function printPackagesInfo(): Promise<void> {
  const extention = system.platform() === "win32" ? ".exe" : "";
  const isLocal = (packageName: string): boolean => {
    return system.pathExists(`${packagesFolder}/${packageName}${extention}`);
  };
  const getVersion = async (cmd: string): Promise<any> => {
    try {
      return await executor.runCommandAsync(cmd);
    } catch (e: any) {
      return undefined;
    }
  };
  const availPackages: any = {
    helm: {
      local: isLocal("helm"),
      version: await getVersion("helm version --short"),
    },
    kubectl: {
      local: isLocal("kubectl"),
      version: JSON.parse((await getVersion("kubectl version --client --output json")) ?? null)
        ?.clientVersion?.gitVersion,
    },
    skopeo: {
      local: isLocal("skopeo"),
      version: (await getVersion("skopeo --version"))?.split(" ")[2],
    },
    k3d: {
      local: isLocal("k3d"),
      version: await getVersion("k3d version"),
    },
  };
  const table = new Table();
  const toGreen = cliOutput.colors.green;
  for (const pkg in availPackages) {
    const pkdDetails = availPackages[pkg];
    const isInstalled = pkdDetails.version ? true : false;
    const version = isInstalled ? pkdDetails.version : "Not installed";
    const pkgLocation = pkdDetails.local ? "Local" : "Global";
    const pkdTableCol = `${pkg}${isInstalled ? " (" + pkgLocation + ")" : ""}`;
    const obj: any = {};
    obj[pkdTableCol] = `${toGreen(version)}`;
    table.push(obj);
  }

  cliOutput.log({
    title: "Packages Information",
    bodyLines: [table.toString()],
  });
}

export function systemDetails(): {
  os: "linux" | "darwin" | "windows";
  arch: "arm64" | "amd64";
  extention: "" | ".exe";
  chmod: boolean;
} {
  const os = system.platform();
  const arch = system.arch();
  let selectedOs: "linux" | "darwin" | "windows";
  let seletedExtention: "" | ".exe" = "";
  let selectionChmod = true;
  if (os === "win32") {
    selectedOs = "windows";
    seletedExtention = ".exe";
    selectionChmod = false;
  } else if (os === "darwin") {
    selectedOs = "darwin";
  } else {
    selectedOs = "linux";
  }
  const selectedArch: "arm64" | "amd64" = arch === "arm" || arch === "arm64" ? "arm64" : "amd64";
  return { os: selectedOs, arch: selectedArch, extention: seletedExtention, chmod: selectionChmod };
}

export async function preparePrerequisites(
  os: "linux" | "darwin" | "windows",
  arch: "arm64" | "amd64",
  all = false
) {
  const settings = deployer.getSettings();
  const sysDetails = systemDetails();
  const selectedOs = os ?? sysDetails.os;
  const selectedArch = arch ?? sysDetails.arch;
  const extention = selectedOs === "windows" ? ".exe" : "";
  system.deletePath(packagesFolder);
  system.createFolder(packagesFolder);
  const prerequisites = [
    {
      name: `helm (${selectedOs}-${selectedArch})`,
      asyncFunc: () =>
        system.downloadFile(
          `https://get.helm.sh/helm-${settings?.PACKAGES?.HELM}-${selectedOs}-${selectedArch}.tar.gz`,
          `${packagesFolder}/helm.tar`
        ),
    },
    {
      name: `kubectl (${selectedOs}-${selectedArch})`,
      asyncFunc: () =>
        system.downloadFile(
          `https://dl.k8s.io/release/${settings?.PACKAGES?.KUBECTL}/bin/${selectedOs}/${selectedArch}/kubectl${extention}`,
          `${packagesFolder}/kubectl${extention}`
        ),
    },
  ];
  const offlinePrerequisites = [
    {
      name: `skopeo (${selectedOs}-${selectedArch})`,
      asyncFunc: () =>
        system.downloadFile(
          `https://github.com/vaggeliskls/skopeo/releases/download/${settings?.PACKAGES?.SKOPEO}/skopeo.${selectedOs}.${selectedArch}${extention}`,
          `${packagesFolder}/skopeo${extention}`
        ),
    },
    {
      name: `k3d (${selectedOs}-${selectedArch})`,
      asyncFunc: () =>
        system.downloadFile(
          `https://github.com/k3d-io/k3d/releases/download/${settings?.PACKAGES?.K3D}/k3d-${selectedOs}-${selectedArch}${extention}`,
          `${packagesFolder}/k3d${extention}`
        ),
    },
  ];
  console.log(
    `https://github.com/vaggeliskls/skopeo/releases/download/${settings?.PACKAGES?.SKOPEO}/skopeo.${selectedOs}.${selectedArch}${extention}`
  );
  const tasks = all ? prerequisites.concat(offlinePrerequisites) : prerequisites;
  await deployer.runTasks(tasks, "Download Prerequisites");
  // helm exteract and prepare
  await system.extractTarFile(`${packagesFolder}/helm.tar`, `${packagesFolder}`, {
    strip: true,
    exclude: ["README.md", "LICENSE"],
  });
  system.deletePath(`${packagesFolder}/helm.tar`);
  if (sysDetails.chmod) {
    await executor.runCommandAsync(`chmod +x ${packagesFolder}/*`);
  }
}
