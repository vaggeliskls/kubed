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
    .action(
      actionRunner(async () => {
        await deployer.generateSingleChart();
        cliOutput.success({ title: "The generation of single chart completed" });
      })
    );
  return generateCli;
}
