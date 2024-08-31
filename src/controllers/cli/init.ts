import { Command, Option } from "commander";

import { cliOutput } from "../../shared/cli";
import { actionRunner } from "../../shared/errors";
import * as deployer from "../deployer";

export function initCli(): Command {
  const initCli = new Command();
  initCli.name("init").description("Initialize deployer");

  initCli
    .description("Initialize deployer requirements")
    .addOption(new Option("-l, --all", "Download all prerequisites").default(false))
    .addOption(
      new Option("-o, --os <value>", "Specify the operating system").choices([
        "windows",
        "darwin",
        "linux",
      ])
    )
    .addOption(
      new Option("-a, --arch <value>", "Specify the architecture").choices(["amd64", "arm64"])
    )
    .action(
      actionRunner(async (options: any) => {
        await deployer.preparePrerequisites(options?.os, options?.arch, options.all);
        await deployer.printPackagesInfo();
        cliOutput.success({ title: "The preparation of deployer requirements completed" });
      })
    );

  initCli
    .command("info")
    .description("Display packages information")
    .action(
      actionRunner(async () => {
        await deployer.printPackagesInfo();
      })
    );

  return initCli;
}
