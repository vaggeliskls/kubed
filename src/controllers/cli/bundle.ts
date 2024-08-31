import { Command, Option } from "commander";

import { actionRunner } from "../../shared/errors";
import * as bundle from "../bundle";
import * as deployer from "../deployer";

export function bundleCli(): Command {
  // BUNDLE
  const bundleCli = new Command();
  bundleCli.name("bundle").description("Bundle generation");
  bundleCli
    .command("images")
    .description("Display environment images")
    .addOption(new Option("--env <text>", "Force environment by name"))
    .addOption(new Option("--change-env", "Change environment selection").default(false))
    .addOption(new Option("--output <text>", "Export list to file"))
    .addOption(
      new Option("-c, --category <value>", "Filter images by category").choices([
        "components",
        "k8s-services",
      ])
    )
    .action(
      actionRunner(async (options: any) => {
        const selectedEnv = await deployer.selectEnvironment(options?.changeEnv, options?.env);
        const envData = deployer.getMergedEnvironment(selectedEnv);
        const deployerValues = await deployer.getDeployerValues(envData, { localOnly: true });
        await bundle.getChartImagesDetails(envData, deployerValues, {
          category: options?.category,
          output: options?.output,
        });
      })
    );

  bundleCli
    .command("transfer")
    .description("Transfer images to a container registry")
    .addOption(new Option("--env <text>", "Force environment by name"))
    .addOption(new Option("--change-env", "Change environment selection").default(false))
    .addOption(new Option("-s, --skip-config", "Skip source aws configure").default(false))
    .addOption(new Option("-r, --skip-repo-create", "Skip ecr repo create").default(false))
    .addOption(
      new Option("-d, --dest <text>", "Destination Registry URL").makeOptionMandatory(true)
    )
    .addOption(
      new Option(
        "-p, --dest-path <text>",
        "Destination prefix repository path"
      ).makeOptionMandatory(false)
    )
    .addOption(
      new Option("-a, --dest-auth <value>", "Destination Registry authentication mechanism")
        .choices(["docker", "ecr"])
        .makeOptionMandatory(true)
    )
    .addOption(
      new Option("-c, --category <value>", "Filter images by category").choices([
        "components",
        "k8s-services",
      ])
    )
    .addOption(new Option("-i, --extra-img [image...]", "Add extra image for tranfsering"))
    .action(
      actionRunner(async (options: any) => {
        const selectedEnv = await deployer.selectEnvironment(options?.changeEnv, options?.env);
        const envData = deployer.getMergedEnvironment(selectedEnv);
        const deployerValues = await deployer.getDeployerValues(envData, { localOnly: true });
        const imagesDetails = await bundle.getChartImagesDetails(envData, deployerValues, {
          category: options?.category,
        });
        await bundle.transferImages(imagesDetails, deployerValues, options?.dest, {
          skipConfigure: options?.skipConfig,
          category: options?.category,
          destAuth: options?.destAuth,
          destPath: options?.destPath,
          skipRepoCreate: options?.skipRepoCreate,
          extraImages: options?.extraImg,
        });
      })
    );

  bundleCli
    .command("prepare")
    .description("Prepare the offline docker archive images bundle")
    .addOption(new Option("--env <text>", "Force environment by name"))
    .addOption(new Option("--change-env", "Change environment selection").default(false))
    .addOption(
      new Option("-c, --category <value>", "Filter images by category")
        .choices(["components", "k8s-services"])
        .makeOptionMandatory(false)
    )
    .addOption(new Option("--aws-config", "Aws configure").default(false))
    .addOption(new Option("--ecr-login", "Ecr login").default(false))
    .addOption(new Option("--docker-login", "Docker login").default(false))
    .addOption(new Option("--output <text>", "Change export folder"))
    .action(
      actionRunner(async (options: any) => {
        const selectedEnv = await deployer.selectEnvironment(options?.changeEnv, options?.env);
        const envData = deployer.getMergedEnvironment(selectedEnv);
        const deployerValues = await deployer.getDeployerValues(envData, { localOnly: true });
        const imagesDetails = await bundle.getChartImagesDetails(
          envData,
          deployerValues,
          options?.category
        );
        await bundle.dockerOciArchiveExport(imagesDetails, deployerValues, {
          awsConfigure: options?.awsConfig,
          ecrLogin: options?.ecrLogin,
          dockerLogin: options?.dockerLogin,
          category: options?.category,
          upload: options?.uploadS3,
          output: options?.output,
        });
      })
    );

  bundleCli
    .command("import")
    .description("Import bundle images to a registry")
    .addOption(new Option("--env <text>", "Force environment by name"))
    .addOption(new Option("--change-env", "Change environment selection").default(false))
    .addOption(
      new Option("-c, --category <value>", "Filter images by category")
        .choices(["all", "components", "k8s-services"])
        .makeOptionMandatory(true)
    )
    .addOption(new Option("-s, --auth", "The destination registry is authenticated").default(false))
    .addOption(
      new Option("-o, --dest-type <value>", "Select destination repository type")
        .choices(["docker-daemon", "docker", "containers-storage"])
        .default("docker")
    )
    .addOption(new Option("-d, --dest <text>", "Destination Registry URL"))
    .action(
      actionRunner(async (options: any) => {
        const category = options?.category === "all" ? undefined : options?.category;
        const selectedEnv = await deployer.selectEnvironment(options.changeEnv, options?.env);
        const envData = deployer.getMergedEnvironment(selectedEnv);
        const deployerValues = await deployer.getDeployerValues(envData, { localOnly: true });
        const imagesDetails = await bundle.getChartImagesDetails(envData, deployerValues, {
          category,
        });
        await bundle.importDockerOciBundle(
          imagesDetails,
          deployerValues,
          options?.dest,
          options?.category,
          {
            auth: options?.auth,
            destType: options?.destType,
          }
        );
      })
    );

  return bundleCli;
}
