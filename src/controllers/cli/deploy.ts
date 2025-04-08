import { Command } from "commander";

import { cliOutput } from "../../shared/cli/output.js";
import { actionRunner } from "../../shared/errors/error-handler.js";
import { isDebug } from "../../shared/utils/env-info.utils.js";
import * as deployer from "../deployer/deployer.js";
import * as state from "../deployer/state.js";
import * as tasks from "../deployer/tasks.js";
import * as kubectl from "../kubernetes/kubectl.js";
import * as helm from "../kubernetes/helm.js";
import * as system from "../system/system.js";
import * as prompt from "../system/prompts.js";
import * as parser from "../deployer/parser.js";

export function deployCli(): Command {
  // DEPLOY
  const deployCli = new Command();
  deployCli.name("deploy").description("Deploy commands");

  deployCli
    .command("up")
    .description("Deploy on kubernetes infrastructure")
    .option("--env <text>", "Force environment by name")
    .option("--change-env", "Change environment selection", false)
    .option("-w, --wait", "Waits until all Pods are in a ready state", false)
    .option("-j, --wait-for-jobs", "Wait until all Jobs have been completed", false)
    .option("--skip-create-namespace", "Skip the creating of the namespace", false)
    .option("--ns-create", "Create individual namespaces of charts", false)
    .option("--state-reset", "Reset deployment state", false)
    .option("--state-skip", "Skip deployment state", false)
    .option("-t, --timeout", "Time to wait for any individual Kubernetes operation", "5m0s")
    .option("-s, --select", "Select releases", false)
    .option("-f, --filter [text...]", "Filter releases by text")
    .option("-g, --group [text...]", "Specify group of releases")
    .option("-x, --exclude [text...]", "Exclude deployer options")
    .option("-o, --override [text...]", "Override deployer options (name='value')")
    .action(
      actionRunner(async (options: any) => {
        const selectedEnv = await deployer.selectEnvironment(options.changeEnv, options?.env);
        const envData = parser.getMergedEnvironment(selectedEnv);
        deployer.deploymentInfo(envData);
        const deployerValues = await deployer.getDeployerValues(envData, {
          exclude: options?.exclude,
          override: options?.override,
          skipCreateNamespace: options?.skipCreateNamespace,
        });
        if (isDebug()) {
          cliOutput.log({
            title: "Deployer Values",
            bodyLines: [JSON.stringify(deployerValues, null, 2)],
          });
        }
        // Get local charts values
        const charts = await parser.getLocalChartsValues(envData, {
          find: options?.filter,
          prompt: options?.select,
          group: options?.group,
          wait: options?.wait,
          waitForJobs: options?.waitForJobs,
          timeout: options?.timeout,
          deployerValues,
          nsCreate: options?.nsCreate,
        });
        // filter by state
        if (options?.stateReset) {
          await state.resetState();
        }
        const chartByState = await state.getChartsByState(charts, options?.stateSkip);
        await tasks.runHelmDeployTaskList(charts);
        if (charts.length === 0 && chartByState.length === 0) {
          cliOutput.warn({ title: "No charts selected for deployment" });
        } else if (charts.length > 0 && chartByState.length === 0) {
          cliOutput.warn({ title: "Charts are already deployed" });
        } else {
          cliOutput.success({ title: "Charts have been deployed successfully" });
        }
      })
    );

  deployCli
    .command("down")
    .description("Destroy kubernetes instances")
    .option("--env <text>", "Force environment by name")
    .option("--change-env", "Change environment selection", false)
    .option("--all", "Delete all deployments", false)
    .option("--ns", "Delete the namespace", false)
    .option("-f, --filter [text...]", "Filter releases by text")
    .action(
      actionRunner(async (options: any) => {
        const selectedEnv = await deployer.selectEnvironment(options.changeEnv, options?.env);
        const envData = parser.getMergedEnvironment(selectedEnv);
        deployer.deploymentInfo(envData);
        // Delete namespace and force delete all pods to prevent terminating pods
        if (options?.ns) {
          await prompt.promptContinue(`Are you sure about the of ${envData.namespace} namespace`);
          await kubectl.deleteNamespace(envData.namespace);
          const pods = await kubectl.getPodsNames(envData.namespace);
          for (const pod of pods) {
            await kubectl.podDelete(pod, envData.namespace);
          }
          cliOutput.success({
            title: `Successfully deleted namespace: ${envData.namespace}`,
          });
          system.terminateApp();
        }
        let releases = await helm.getRemoteReleases(envData.namespace);
        if (releases.length === 0) {
          cliOutput.error({ title: "No available helm releases" });
          system.terminateApp();
        }

        if (options?.filter) {
          releases = releases.filter((release: string) =>
            (options?.filter as string[]).some((term: string) => release.includes(term))
          );
        }

        if (releases.length === 0) {
          cliOutput.warn({
            title: "No releases found",
          });
        }

        const selectedReleases =
          options?.filter || options?.all
            ? releases
            : await prompt.promptMultipleChoise("Select online releases", releases);
        cliOutput.success({
          title: `Selected releases (${selectedReleases.length}): ${selectedReleases.join()}`,
        });
        await prompt.promptContinue("Are you sure about the deletion of the selected releases");

        await tasks.runTasks(
          selectedReleases.map((release: string) => {
            return {
              name: release,
              asyncFunc: () =>
                helm.uninstall({ name: release, namespace: envData.namespace } as any),
            };
          }),
          "Helm uninstall releases"
        );
        cliOutput.success({ title: "The delete operation completed" });
      })
    );
  return deployCli;
}
