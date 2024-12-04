import { Command, Option } from "commander";

import { executor } from "../../../shared/cli";
import { actionRunner } from "../../../shared/errors";

export function k8sServiceCli(): Command {
  // DEPLOY
  const k8sServiceCli = new Command();
  k8sServiceCli.name("service").description("Kubernetes service management system");

  k8sServiceCli
    .command("list")
    .description("List services")
    .addOption(new Option("-n, --namespace <value>", "Namespace").makeOptionMandatory(true))
    .action(
      actionRunner(async (options: any) => {
        await executor.runCommandAsync(`kubectl get services -n ${options?.namespace}`, {
          stdio: "inherit",
        });
      })
    );

  return k8sServiceCli;
}
