import { Command } from "commander";

import { cliOutput } from "../../shared/cli";
import { actionRunner } from "../../shared/errors";
import { isDebug } from "../../shared/utils";
import * as deployer from "../deployer";
import * as k8s from "../kubernetes";
import * as system from "../system";

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
        const envData = deployer.getMergedEnvironment(selectedEnv);
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
        const charts = await deployer.getLocalChartsValues(envData, {
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
          await deployer.resetState();
        }
        const chartByState = await deployer.getChartsByState(charts, options?.stateSkip);
        await deployer.runHelmDeployTaskList(charts);
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
    .option("--all", "Delete the namespace", false)
    .option("-f, --filter [text...]", "Filter releases by text")
    .action(
      actionRunner(async (options: any) => {
        const selectedEnv = await deployer.selectEnvironment(options.changeEnv, options?.env);
        const envData = deployer.getMergedEnvironment(selectedEnv);
        deployer.deploymentInfo(envData);
        if (options?.all) {
          await system.promptContinue(
            `Are you sure about about deleting namespace: ${envData.namespace}`
          );
          await k8s.deleteNamespace(envData.namespace);
          const pods = await k8s.getPodsNames(envData.namespace);
          for (const pod of pods) {
            await k8s.podDelete(pod, envData.namespace);
          }
        } else {
          const releases = await k8s.getRemoteReleases(envData.namespace);
          if (releases.length === 0) {
            cliOutput.error({ title: "No available helm releases" });
            system.terminateApp();
          }
          let selectedReleases: string[];
          if (options?.filter) {
            selectedReleases = releases.filter((release: string) =>
              (options?.filter as string[]).some((term: string) => term.includes(release))
            );
          } else {
            selectedReleases = await system.promptMultipleChoise(
              "Select online releases",
              releases
            );
          }
          cliOutput.success({
            title: `Selected releases (${selectedReleases.length}): ${selectedReleases.join()}`,
          });
          await system.promptContinue("Are you sure about the deletion of the selected releases");
          await deployer.runTasks(
            selectedReleases.map((release: string) => {
              return {
                name: release,
                asyncFunc: () =>
                  k8s.uninstall({ name: release, namespace: envData.namespace } as any),
              };
            }),
            "Helm uninstall releases"
          );
        }

        cliOutput.success({ title: "The delete operation completed" });
      })
    );
  return deployCli;
}
