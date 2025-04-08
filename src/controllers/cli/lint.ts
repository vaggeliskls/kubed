import { Command } from "commander";

import { cliOutput } from "../../shared/cli/output.js";
import { actionRunner } from "../../shared/errors/error-handler.js";
import * as deployer from "../deployer/deployer.js";
import { IChartsData } from "../deployer/environment.model.js";
import * as helm from "../kubernetes/helm.js";
import * as parser from "../deployer/parser.js";
import * as tasks from "../deployer/tasks.js";

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
        const envData = parser.getMergedEnvironment(selectedEnv);
        deployer.deploymentInfo(envData);
        const deployerValues = await deployer.getDeployerValues(envData, { localOnly: true });
        // Get local charts values
        const charts = await parser.getLocalChartsValues(envData, {
          find: options?.filter,
          prompt: options?.select,
          group: options?.group,
          deployerValues,
        });
        await tasks.runTasks(
          charts.map((chart: IChartsData) => {
            return {
              name: chart.name,
              asyncFunc: () => helm.lint(chart),
            };
          }),
          "Templates Linting"
        );

        cliOutput.success({ title: "The lint operation completed" });
      })
    );
  return lintCli;
}
