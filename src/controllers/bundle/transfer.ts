import { cliOutput, executor } from "../../shared/cli";
import { DockerImageDetails } from "../deployer";
import * as deployer from "../deployer";
import * as system from "../system";

export async function transferImages(
  imagesDetails: DockerImageDetails[],
  deployerValues: deployer.IDict,
  dest: string,
  options?: {
    skipConfigure?: boolean;
    category?: "components" | "k8s-services";
    destAuth?: "docker" | "ecr";
    skipRepoCreate?: boolean;
    destPath?: string;
    extraImages?: string[];
  }
): Promise<void> {
  cliOutput.log({ title: `Transfer ${options?.category} images to ${dest}` });
  const registry = deployerValues["REGISTRY"];
  // Add extra images to transfer
  for (const image of options?.extraImages ?? []) {
    imagesDetails.push(system.dockerImageProcess(image));
  }
  // Authentication Section
  if (options?.skipConfigure ? false : true) {
    cliOutput.log({ title: "Authenticate source registry" });
    await executor.runCommandAsync("aws configure", { stdio: "inherit" });
    // On linux: aws ecr get-login-password --region eu-west-2 | skopeo login --username AWS --password-stdin ${registry}
    const token = await executor.runCommandAsync("aws ecr get-login-password --region eu-west-2");
    await executor.runCommandAsync(`skopeo login --username AWS --password-stdin ${registry}`, {
      input: token,
    });
  }
  if (options?.destAuth === "docker") {
    await executor.runCommandAsync(`skopeo login ${dest}`, { stdio: "inherit" });
  }
  // Extract details from aws dest ex. 400864493915.dkr.ecr.eu-west-2.amazonaws.com
  const region = dest.split(".")[3] ?? ""; // eu-west-2
  const registryID = dest.split(".")[0] ?? ""; // 400864493915
  if (options?.destAuth === "ecr" && (options?.skipConfigure ? false : true)) {
    cliOutput.log({ title: "Authenticate destination registry" });
    await executor.runCommandAsync("aws configure", { stdio: "inherit" });
    const token = await executor.runCommandAsync(`aws ecr get-login-password --region ${region}`);
    await executor.runCommandAsync(`skopeo login --username AWS --password-stdin ${dest}`, {
      input: token,
    });
  }
  // End Authentication Section
  let index = 1;
  for (const imageDetails of imagesDetails) {
    const destImageTag = imageDetails.tag ? `:${imageDetails.tag}` : "";
    const destImageUrl = `${dest}${options?.destPath ?? ""}/${imageDetails.repository}${destImageTag}`;

    cliOutput.log({
      title: `Transfer (${index}/${imagesDetails.length}) ${imageDetails.image} -> ${destImageUrl}`,
    });
    // ECR don't create  the repository by default so we have to create before transfer
    if (options?.destAuth === "ecr" && options?.skipRepoCreate === false) {
      try {
        await executor.runCommandAsync(
          `aws ecr create-repository --region ${region} --registry-id ${registryID} --repository-name ${imageDetails.repository}`
        );
      } catch (err: any) {
        if (!err.includes("RepositoryAlreadyExistsException")) throw err;
      }
    }

    await executor.runCommandAsync(
      `skopeo copy --insecure-policy --all --retry-times=3 docker://${imageDetails.image} docker://${destImageUrl}`,
      { silent: false }
    );
    index++;
  }
  cliOutput.success({ title: `The transfer of ${options?.category} images completed` });
}
