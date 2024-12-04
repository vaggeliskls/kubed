import { Command } from "commander";

import { cliOutput, executor } from "../../../shared/cli";
import { actionRunner } from "../../../shared/errors";
import * as system from "../../system";

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
        const selected = await system.promptChoise("Select storage class", names);
        await executor.runCommandAsync(`kubectl delete storageclass ${selected}`, {
          stdio: "inherit",
        });
        cliOutput.success({ title: "The delete operation completed" });
      })
    );

  return k8sStorageClassCli;
}
