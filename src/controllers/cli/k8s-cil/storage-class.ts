import { Command } from "commander";

import { executor } from "../../../shared/cli/executor.js";
import { cliOutput } from "../../../shared/cli/output.js";
import { actionRunner } from "../../../shared/errors/error-handler.js";
import * as system from "../../system/system.js";
import * as prompt from "../../system/prompts.js";

export function k8sStorageClassCli(): Command {
  // DEPLOY
  const k8sStorageClassCli = new Command();
  k8sStorageClassCli
    .name("storage-class")
    .description("Kubernetes storage class management system");

  k8sStorageClassCli
    .command("list")
    .description("List storage classes")
    .action(
      actionRunner(async () => {
        await executor.runCommandAsync("kubectl get storageclass", { stdio: "inherit" });
      })
    );

  k8sStorageClassCli
    .command("delete")
    .description("Delete storage class by name")
    .action(
      actionRunner(async () => {
        const jsonResponse = JSON.parse(
          await executor.runCommandAsync("kubectl get storageclass -o json")
        );
        const names: string[] = jsonResponse?.items.map((x: any) => x?.metadata?.name) ?? [];
        if (names.length === 0) {
          cliOutput.error({ title: "No available storage classes" });
          system.terminateApp();
        }
        const selected = await prompt.promptChoise("Select storage class", names);
        await executor.runCommandAsync(`kubectl delete storageclass ${selected}`, {
          stdio: "inherit",
        });
        cliOutput.success({ title: "The delete operation completed" });
      })
    );

  return k8sStorageClassCli;
}
