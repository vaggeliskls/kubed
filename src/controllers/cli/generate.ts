import { Command } from "commander";

import { cliOutput } from "../../shared/cli";
import { actionRunner } from "../../shared/errors";
import * as deployer from "../deployer";

export function generateCli(): Command {
  const generateCli = new Command();
  generateCli.name("generate").description("Generate charts");

  generateCli
    .command("single-chart")
    .description("Generate single chart [BETA]")
    .option("--apiversion <text>", "Chart app version", "v2")
    .option("--name <text>", "Chart name", "single-chart-generator")
    .option("--chartversion <text>", "Chart version", "0.1.0")
    .option("--appversion <text>", "Chart app version", "0.1.0")
    .option("--type <text>", "Chart type", "application")
    .option("--description <text>", "Chart description", "The generic single chart application")
    .option("--env <text>", "Force environment by name")
    .option("--change-env", "Change environment selection", false)
    .action(
      actionRunner(async (options: any) => {
        await deployer.selectEnvironment(options.changeEnv, options?.env);
        await deployer.singleChart({
          apiVersion: options?.apiversion,
          name: options?.name,
          version: options?.chartversion,
          appVersion: options?.appversion,
          type: options?.type,
          description: options?.description,
          dependencies: [],
        });
        cliOutput.success({ title: "The generation of single chart completed" });
      })
    );
  return generateCli;
}
