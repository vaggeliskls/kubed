import Table from "cli-table3";
import { Command, Option } from "commander";

import { executor } from "../../../shared/cli/executor.js";
import { cliOutput } from "../../../shared/cli/output.js";
import { actionRunner } from "../../../shared/errors/error-handler.js";
import * as kubectl from "../../kubernetes/kubectl.js";
import * as prompt from "../../system/prompts.js";
import * as system from "../../system/system.js";

async function selectConfigMap(namespace: string): Promise<string> {
  const jsonResponse = JSON.parse(
    await executor.runCommandAsync(`kubectl get configmaps -n ${namespace} -o json`)
  );
  const names: string[] = jsonResponse?.items.map((x: any) => x?.metadata?.name) ?? [];
  if (names.length === 0) {
    cliOutput.error({ title: "No available config maps" });
    system.terminateApp();
  }
  return await prompt.promptChoise("Select config map", names);
}

export function k8sConfigMapCli(): Command {
  // DEPLOY
  const k8sConfigMapCli = new Command();
  k8sConfigMapCli.name("configmap").description("Kubernetes configmaps management system");

  k8sConfigMapCli
    .command("list")
    .description("List configmaps")
    .addOption(new Option("-n, --namespace <value>", "Namespace").makeOptionMandatory(true))
    .action(
      actionRunner(async (options: any) => {
        const namespace = options?.namespace ? `-n ${options?.namespace}` : "";
        await executor.runCommandAsync(`kubectl get configmaps ${namespace}`, { stdio: "inherit" });
      })
    );

  k8sConfigMapCli
    .command("show")
    .description("Show configmap data")
    .addOption(new Option("-n, --namespace <value>", "Namespace").makeOptionMandatory(true))
    .action(
      actionRunner(async (options: any) => {
        const selected = await selectConfigMap(options?.namespace);
        const configMapValues = await kubectl.getConfigMapData(selected, options?.namespace);
        const toGreen = cliOutput.colors.green;
        const table = new Table({
          head: [toGreen("Property"), toGreen("Value")],
        });
        for (const [key, value] of Object.entries(configMapValues ?? {})) {
          table.push([key, String(value)]);
        }
        cliOutput.log({
          title: "Config Map",
          bodyLines: [table.toString()],
        });
      })
    );

  k8sConfigMapCli
    .command("edit")
    .description("Edit configmap data")
    .addOption(new Option("-n, --namespace <value>", "Namespace").makeOptionMandatory(true))
    .action(
      actionRunner(async (options: any) => {
        const selected = await selectConfigMap(options?.namespace);
        await executor.runCommandAsync(
          `kubectl edit configmap ${selected} -n ${options?.namespace}`,
          { stdio: "inherit" }
        );
      })
    );

  k8sConfigMapCli
    .command("delete")
    .description("Delete config maps by name")
    .addOption(new Option("-n, --namespace <value>", "Namespace").makeOptionMandatory(true))
    .action(
      actionRunner(async (options: any) => {
        const selected = await selectConfigMap(options?.namespace);
        await executor.runCommandAsync(
          `kubectl delete configmap ${selected} -n ${options?.namespace}`,
          { stdio: "inherit" }
        );
        cliOutput.success({ title: "The delete operation completed" });
      })
    );

  return k8sConfigMapCli;
}
