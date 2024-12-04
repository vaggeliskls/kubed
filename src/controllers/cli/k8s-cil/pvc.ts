import { Command, Option } from "commander";

import { cliOutput, executor } from "../../../shared/cli";
import { actionRunner } from "../../../shared/errors";
import * as system from "../../system";

async function selectPvcs(namespace: string): Promise<string> {
  const jsonResponse = JSON.parse(
    await executor.runCommandAsync(`kubectl get pvc -n ${namespace} -o json`)
  );
  const names: string[] = jsonResponse?.items.map((x: any) => x?.metadata?.name) ?? [];
  if (names.length === 0) {
    cliOutput.error({ title: "No available persistent volumes" });
    system.terminateApp();
  }
  return await system.promptChoise("Select persistent volume", names);
}

export function k8sPvCCli(): Command {
  // DEPLOY
  const k8sPvCCli = new Command();
  k8sPvCCli.name("pvc").description("Kubernetes persistent volume claims management system");

  k8sPvCCli
    .command("list")
    .description("List persistent volume claims")
    .addOption(new Option("-n, --namespace <value>", "Namespace").makeOptionMandatory(false))
    .action(
      actionRunner(async (options: any) => {
        const namespace = options?.namespace ? `-n ${options?.namespace}` : "--all-namespaces";
        await executor.runCommandAsync(`kubectl get pvc ${namespace}`, { stdio: "inherit" });
      })
    );

  k8sPvCCli
    .command("delete")
    .description("Delete persistent volume claims by name")
    .addOption(new Option("-n, --namespace <value>", "Namespace").makeOptionMandatory(true))
    .action(
      actionRunner(async (options: any) => {
        const selected = await selectPvcs(options?.namespace);
        await executor.runCommandAsync(`kubectl delete pvc ${selected} -n ${options?.namespace}`, {
          stdio: "inherit",
        });
        cliOutput.success({ title: "The delete operation completed" });
      })
    );

  return k8sPvCCli;
}
