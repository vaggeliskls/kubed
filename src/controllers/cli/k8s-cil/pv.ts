import { Command, Option } from "commander";

import { executor } from "../../../shared/cli/executor.js";
import { cliOutput } from "../../../shared/cli/output.js";
import { actionRunner } from "../../../shared/errors/error-handler.js";

export function k8sPvCli(): Command {
  // DEPLOY
  const k8sPvCli = new Command();
  k8sPvCli.name("pv").description("Kubernetes persistent volumes management system");

  k8sPvCli
    .command("list")
    .description("List persistent volumes")
    .action(
      actionRunner(async () => {
        await executor.runCommandAsync("kubectl get pv", { stdio: "inherit" });
      })
    );

  k8sPvCli
    .command("delete")
    .description("Delete persistent volumes by name")
    .addOption(new Option("-f, --name <value>", "Name").makeOptionMandatory(true))
    .action(
      actionRunner(async (options: any) => {
        await executor.runCommandAsync(`kubectl delete pv ${options?.name}`, { stdio: "inherit" });
        cliOutput.success({ title: "The delete operation completed" });
      })
    );

  return k8sPvCli;
}
