import { Command, Option } from "commander";

import { cliOutput } from "../../shared/cli/output.js";
import { actionRunner } from "../../shared/errors/error-handler.js";
import * as packages from "../deployer/packages.js";

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
        await packages.preparePrerequisites(options?.os, options?.arch, options.all);
        await packages.printPackagesInfo();
        cliOutput.success({ title: "The preparation of deployer requirements completed" });
      })
    );

  return initCli;
}
