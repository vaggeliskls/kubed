import { Command } from "commander";

import { executor } from "../../shared/cli";
import { actionRunner } from "../../shared/errors";

const SLICE_ARGUMENTS_LIMIT = 3;

export function kubectlCli(): Command {
  const kubectlCli = new Command();
  kubectlCli
    .name("kubectl")
    .description("Kubectl command wrapper")
    .allowUnknownOption()
    .action(
      actionRunner(async () => {
        const cmd = process.argv.splice(SLICE_ARGUMENTS_LIMIT, process.argv.length).join(" ");
        await executor.runCommandAsync(cmd, { stdio: "inherit" });
      })
    );
  return kubectlCli;
}

export function helmCli(): Command {
  const helmCli = new Command();
  helmCli
    .name("helm")
    .description("Helm command wrapper")
    .allowUnknownOption()
    .action(
      actionRunner(async () => {
        const cmd = process.argv.splice(SLICE_ARGUMENTS_LIMIT, process.argv.length).join(" ");
        await executor.runCommandAsync(cmd, { stdio: "inherit" });
      })
    );
  return helmCli;
}

export function skopeoCli(): Command {
  const skopeoCli = new Command();
  skopeoCli
    .name("skopeo")
    .description("Skopeo command wrapper")
    .allowUnknownOption()
    .action(
      actionRunner(async () => {
        const cmd = process.argv.splice(SLICE_ARGUMENTS_LIMIT, process.argv.length).join(" ");
        await executor.runCommandAsync(cmd, { stdio: "inherit" });
      })
    );
  return skopeoCli;
}

export function k3dWrapperCli(): Command {
  const k3dWrapperCli = new Command();
  k3dWrapperCli
    .name("k3d")
    .description("K3d command wrapper")
    .allowUnknownOption()
    .action(
      actionRunner(async () => {
        const cmd = process.argv.splice(SLICE_ARGUMENTS_LIMIT, process.argv.length).join(" ");
        await executor.runCommandAsync(cmd, { stdio: "inherit" });
      })
    );
  return k3dWrapperCli;
}

export function wrappersCLI(): Command {
  const wrappersCLI = new Command();
  wrappersCLI.name("wrapper").description("Commands wrappers");

  wrappersCLI.addCommand(kubectlCli());
  wrappersCLI.addCommand(skopeoCli());
  wrappersCLI.addCommand(k3dWrapperCli());
  wrappersCLI.addCommand(helmCli());
  return wrappersCLI;
}
