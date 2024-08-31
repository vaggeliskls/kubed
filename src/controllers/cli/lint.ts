import { Command } from "commander";

import { cliOutput } from "../../shared/cli";
import { actionRunner } from "../../shared/errors";
import * as deployer from "../deployer";
import * as k8s from "../kubernetes";

export function lintCli(): Command {
  const lintCli = new Command();
  lintCli.name("lint").description("Lint templates");

  lintCli
    .option("--env <text>", "Force environment by name")
    .option("--change-env", "Change environment selection", false)
    .option("-s, --select", "Select releases", false)
    .option("-f, --filter [text...]", "Filter releases by text")
    .option("-g, --group [text...]", "Specify group of releases")
    .action(
      actionRunner(async (options: any) => {
        const selectedEnv = await deployer.selectEnvironment(options.changeEnv, options?.env);
        const envData = deployer.getMergedEnvironment(selectedEnv);
        deployer.deploymentInfo(envData);
        const deployerValues = await deployer.getDeployerValues(envData, { localOnly: true });
        // Get local charts values
        const charts = await deployer.getLocalChartsValues(envData, {
          find: options?.filter,
          prompt: options?.select,
          group: options?.group,
          deployerValues,
        });
        await deployer.runTasks(
          charts.map((chart: deployer.IChartsData) => {
            return {
              name: chart.name,
              asyncFunc: () => k8s.lint(chart),
            };
          }),
          "Templates Linting"
        );

        cliOutput.success({ title: "The lint operation completed" });
      })
    );
  return lintCli;
}
