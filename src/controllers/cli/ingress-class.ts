import { Command } from "commander";

import { cliOutput, executor } from "../../shared/cli";
import { actionRunner } from "../../shared/errors";
import * as system from "../system";

export function k8sIngressClassCli(): Command {
  // DEPLOY
  const k8sIngressClassCli = new Command();
  k8sIngressClassCli
    .name("ingress-class")
    .description("Kubernetes ingress class management system");

  k8sIngressClassCli
    .command("list")
    .description("List ingress classes")
    .action(
      actionRunner(async () => {
        await executor.runCommandAsync("kubectl get ingressclass", { stdio: "inherit" });
      })
    );

  k8sIngressClassCli
    .command("delete")
    .description("Delete ingress class by name")
    .action(
      actionRunner(async () => {
        const jsonResponse = JSON.parse(
          await executor.runCommandAsync("kubectl get ingressclass -o json")
        );
        const names: string[] = jsonResponse?.items.map((x: any) => x?.metadata?.name) ?? [];
        if (names.length === 0) {
          cliOutput.error({ title: "No available ingress classes" });
          system.terminateApp();
        }
        const selected = await system.promptChoise("Select ingress class", names);
        await executor.runCommandAsync(`kubectl delete ingressclass ${selected}`, {
          stdio: "inherit",
        });
        cliOutput.success({ title: "The delete operation completed" });
      })
    );

  return k8sIngressClassCli;
}
