import Table from "cli-table3";
import { Command, Option } from "commander";

import { cliOutput, executor } from "../../shared/cli";
import { actionRunner } from "../../shared/errors";
import * as deployer from "../deployer";
import * as k8s from "../kubernetes";

import * as k8sIngressClass from "./ingress-class";
import * as pods from "./pods";
import * as k8sStorageClass from "./storage-class";

export function k8sCli(): Command {
  // DEPLOY
  const k8sCli = new Command();
  k8sCli.name("k8s").description("Kubernetes management system");

  k8sCli.addCommand(pods.k8sPodsCli());
  k8sCli
    .command("configMap")
    .description("Display config map values by name")
    .option("--env <text>", "Force environment by name")
    .option("--change-env", "Change environment selection", false)
    .addOption(new Option("-n, --name <text>", "Config map name").makeOptionMandatory(true))
    .action(
      actionRunner(async (options: any) => {
        const selectedEnv = await deployer.selectEnvironment(options.changeEnv, options?.env);
        const envData = deployer.getMergedEnvironment(selectedEnv);
        const configMapValues = await k8s.getConfigMapData(options?.name, envData.namespace);
        const toGreen = cliOutput.colors.green;
        const table = new Table({
          head: [toGreen("Property"), toGreen("Value")],
        });
        for (const [key, value] of Object.entries(configMapValues ?? {})) {
          table.push([key, value]);
        }
        cliOutput.log({
          title: "Config Map",
          bodyLines: [table.toString()],
        });
        cliOutput.success({ title: "Display of config map completed" });
      })
    );

  k8sCli
    .command("secret")
    .description("Display secret values by name")
    .option("--env <text>", "Force environment by name")
    .option("--change-env", "Change environment selection", false)
    .addOption(new Option("-n, --name <text>", "Secret name").makeOptionMandatory(true))
    .action(
      actionRunner(async (options: any) => {
        const selectedEnv = await deployer.selectEnvironment(options.changeEnv, options?.env);
        const envData = deployer.getMergedEnvironment(selectedEnv);
        const configMapValues = await k8s.getSecretData(options?.name, envData.namespace);
        const toGreen = cliOutput.colors.green;
        const table = new Table({
          head: [toGreen("Property"), toGreen("Value")],
        });
        for (const [key, value] of Object.entries(configMapValues ?? {})) {
          table.push([key, value]);
        }
        cliOutput.log({
          title: "Secret",
          bodyLines: [table.toString()],
        });
        cliOutput.success({ title: "Display of secret completed" });
      })
    );

  k8sCli
    .command("pvc")
    .description("List Persistent volume claims")
    .action(
      actionRunner(async () => {
        await executor.runCommandAsync("kubectl get pvc --all-namespaces", { stdio: "inherit" });
        cliOutput.success({ title: "Display of persistent volumes claims completed" });
      })
    );

  k8sCli
    .command("pv")
    .description("List Persistent volumes")
    .action(
      actionRunner(async () => {
        await executor.runCommandAsync("kubectl get pv", { stdio: "inherit" });
        cliOutput.success({ title: "Display of persistent volumes completed" });
      })
    );

  k8sCli
    .command("storageClass")
    .description("List Storage classes")
    .action(
      actionRunner(async () => {
        await executor.runCommandAsync("kubectl get storageclasses", { stdio: "inherit" });
        cliOutput.success({ title: "Display of storage classes completed" });
      })
    );

  k8sCli.addCommand(k8sIngressClass.k8sIngressClassCli());
  k8sCli.addCommand(k8sStorageClass.k8sStorageClassCli());
  return k8sCli;
}
