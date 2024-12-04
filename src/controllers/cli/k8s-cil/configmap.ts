import Table from "cli-table3";
import { Command, Option } from "commander";

import { cliOutput, executor } from "../../../shared/cli";
import { actionRunner } from "../../../shared/errors";
import * as k8s from "../../kubernetes";
import * as system from "../../system";

async function selectConfigMap(namespace: string): Promise<string> {
  const jsonResponse = JSON.parse(
    await executor.runCommandAsync(`kubectl get configmaps -n ${namespace} -o json`)
  );
  const names: string[] = jsonResponse?.items.map((x: any) => x?.metadata?.name) ?? [];
  if (names.length === 0) {
    cliOutput.error({ title: "No available config maps" });
    system.terminateApp();
  }
  return await system.promptChoise("Select config map", names);
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
        const configMapValues = await k8s.getConfigMapData(selected, options?.namespace);
        const toGreen = cliOutput.colors.green;
        const table = new Table({
          head: [toGreen("Property"), toGreen("Value")],
        });
        for (const [key, value] of Object.entries(configMapValues ?? {})) {
          table.push([key, value]);
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
