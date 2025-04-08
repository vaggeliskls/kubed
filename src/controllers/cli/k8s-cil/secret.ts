import Table from "cli-table3";
import { Command, Option } from "commander";

import { executor } from "../../../shared/cli/executor.js";
import { cliOutput } from "../../../shared/cli/output.js";
import { actionRunner } from "../../../shared/errors/error-handler.js";
import * as kubectl from "../../kubernetes/kubectl.js";
import * as system from "../../system/system.js";
import * as prompt from "../../system/prompts.js";

async function selectSecret(namespace: string): Promise<string> {
  const jsonResponse = JSON.parse(
    await executor.runCommandAsync(`kubectl get secret -n ${namespace} -o json`)
  );
  const names: string[] = jsonResponse?.items.map((x: any) => x?.metadata?.name) ?? [];
  if (names.length === 0) {
    cliOutput.error({ title: "No available secret" });
    system.terminateApp();
  }
  return await prompt.promptChoise("Select secret", names);
}

export function k8sSecretCli(): Command {
  // DEPLOY
  const k8sSecretCli = new Command();
  k8sSecretCli.name("secret").description("Kubernetes secret management system");

  k8sSecretCli
    .command("list")
    .description("List secret claims")
    .addOption(new Option("-n, --namespace <value>", "Namespace").makeOptionMandatory(true))
    .action(
      actionRunner(async (options: any) => {
        const namespace = options?.namespace ? `-n ${options?.namespace}` : "";
        await executor.runCommandAsync(`kubectl get configmaps ${namespace}`, { stdio: "inherit" });
      })
    );

  k8sSecretCli
    .command("show")
    .description("Show secret data")
    .addOption(new Option("-n, --namespace <value>", "Namespace").makeOptionMandatory(true))
    .action(
      actionRunner(async (options: any) => {
        const selected = await selectSecret(options?.namespace);
        const secretValues = await kubectl.getSecretData(selected, options?.namespace);
        const toGreen = cliOutput.colors.green;
        const table = new Table({
          head: [toGreen("Property"), toGreen("Value")],
        });
        for (const [key, value] of Object.entries(secretValues ?? {})) {
          table.push([key, String(value)]);
        }
        cliOutput.log({
          title: "Secret",
          bodyLines: [table.toString()],
        });
      })
    );

  k8sSecretCli
    .command("edit")
    .description("Edit secret data")
    .addOption(new Option("-n, --namespace <value>", "Namespace").makeOptionMandatory(true))
    .action(
      actionRunner(async (options: any) => {
        const selected = await selectSecret(options?.namespace);
        await executor.runCommandAsync(`kubectl edit secret ${selected} -n ${options?.namespace}`, {
          stdio: "inherit",
        });
      })
    );

  k8sSecretCli
    .command("delete")
    .description("Delete secret by name")
    .addOption(new Option("-n, --namespace <value>", "Namespace").makeOptionMandatory(true))
    .action(
      actionRunner(async (options: any) => {
        const selected = await selectSecret(options?.namespace);
        await executor.runCommandAsync(
          `kubectl delete secret ${selected} -n ${options?.namespace}`,
          { stdio: "inherit" }
        );
        cliOutput.success({ title: "The delete operation completed" });
      })
    );

  return k8sSecretCli;
}
