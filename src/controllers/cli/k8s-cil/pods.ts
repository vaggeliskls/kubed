import { Command } from "commander";

import { cliOutput } from "../../../shared/cli";
import { actionRunner } from "../../../shared/errors";
import * as deployer from "../../deployer";
import * as k8s from "../../kubernetes";
import * as system from "../../system";

export function k8sPodsCli(): Command {
  // DEPLOY
  const k8sPodsCli = new Command();
  k8sPodsCli.name("pods").description("Kubernetes pods management system");

  k8sPodsCli
    .command("list")
    .description("List pods of all namespaces")
    .option("--all", "All namespaces", false)
    .option("-n, --namespace <text>", "Namespace")
    .action(
      actionRunner(async (options: any) => {
        const selectedEnv = await deployer.selectEnvironment(options.changeEnv, options?.env);
        const envData = deployer.getMergedEnvironment(selectedEnv);
        const namespace = options?.namespace ?? envData.namespace;
        await k8s.listPods(options?.all ? null : namespace);
      })
    );

  k8sPodsCli
    .command("delete")
    .description("Delete pods by name")
    .option("-n, --namespace <text>", "Namespace")
    .option("--env <text>", "Force environment by name")
    .option("--change-env", "Change environment selection", false)
    .option("-f, --filter [text...]", "Filter pods by text")
    .action(
      actionRunner(async (options: any) => {
        const selectedEnv = await deployer.selectEnvironment(options.changeEnv, options?.env);
        const envData = deployer.getMergedEnvironment(selectedEnv);
        const namespace = options?.namespace ?? envData.namespace;
        const pods = await k8s.getPodsNames(namespace);
        if (pods.length === 0) {
          cliOutput.error({ title: `Namespace: ${namespace}, No available pods` });
          system.terminateApp();
        }
        let selectedpods;
        if (options.filter) {
          selectedpods = pods.filter((pod: string) =>
            options?.filter.some((term: string) => pod?.includes(term))
          );
        } else {
          selectedpods = await system.promptMultipleChoise("Select pods", pods);
        }
        cliOutput.success({
          title: `Selected pods (${selectedpods.length}): ${selectedpods.join()}`,
        });
        await system.promptContinue("Are you sure about about deleting selected pods");
        for (const pod of selectedpods) {
          await k8s.podDelete(pod, namespace);
        }

        cliOutput.success({ title: "The pod delete operation completed" });
      })
    );

  k8sPodsCli
    .command("logs")
    .option("-n, --namespace <text>", "Namespace")
    .option("--env <text>", "Force environment by name")
    .option("--change-env", "Change environment selection", false)
    .option("-f, --filter <text>", "Filter pods by text")
    .action(
      actionRunner(async (options: any) => {
        const selectedEnv = await deployer.selectEnvironment(options.changeEnv, options?.env);
        const envData = deployer.getMergedEnvironment(selectedEnv);
        const namespace = options?.namespace ?? envData.namespace;
        const pods = await k8s.getPodsNames(namespace);
        if (pods.length === 0) {
          cliOutput.warn({ title: `Namespace: ${namespace}, No available pods` });
          system.terminateApp();
        }
        let selectedpod: string;
        if (options.filter) {
          selectedpod = pods.filter((pod: string) => pod.includes(options?.filter)) as any;
          if (selectedpod.length === 0) {
            cliOutput.warn({ title: "No pods found" });
            system.terminateApp();
          }
          selectedpod = selectedpod[0];
        } else {
          selectedpod = await system.promptChoise("Select pod", pods);
        }
        cliOutput.success({ title: `Logs ${selectedpod}` });
        await k8s.podLogs(namespace, selectedpod);
        cliOutput.success({ title: "The pod logs operation completed" });
      })
    );
  k8sPodsCli
    .command("describe")
    .description("Describe a pod by name")
    .option("-n, --namespace <text>", "Namespace")
    .option("--env <text>", "Force environment by name")
    .option("--change-env", "Change environment selection", false)
    .option("-f, --filter <text>", "Filter pods by text")
    .action(
      actionRunner(async (options: any) => {
        const selectedEnv = await deployer.selectEnvironment(options.changeEnv, options?.env);
        const envData = deployer.getMergedEnvironment(selectedEnv);
        const namespace = options?.namespace ?? envData.namespace;
        const pods = await k8s.getPodsNames(namespace);
        if (pods.length === 0) {
          cliOutput.error({ title: `Namespace: ${namespace}, No available pods` });
          system.terminateApp();
        }
        let selectedpod: string;
        if (options.filter) {
          selectedpod = pods.filter((pod: string) => pod.includes(options?.filter)) as any;
          if (selectedpod.length === 0) {
            cliOutput.warn({ title: "No pods found" });
            system.terminateApp();
          }
          selectedpod = selectedpod[0];
        } else {
          selectedpod = await system.promptChoise("Select pod", pods);
        }
        cliOutput.success({ title: `Describe ${selectedpod}` });
        await k8s.describePod(namespace, selectedpod);
        cliOutput.success({ title: "The pod describe operation completed" });
      })
    );

  k8sPodsCli
    .command("attach")
    .description("Attach to a pod by name")
    .option("-n, --namespace <text>", "Namespace")
    .option("--env <text>", "Force environment by name")
    .option("--change-env", "Change environment selection", false)
    .option("-f, --filter <text>", "Filter pods by text")
    .action(
      actionRunner(async (options: any) => {
        const selectedEnv = await deployer.selectEnvironment(options.changeEnv, options?.env);
        const envData = deployer.getMergedEnvironment(selectedEnv);
        const namespace = options?.namespace ?? envData.namespace;
        const pods = await k8s.getPodsNames(namespace);
        if (pods.length === 0) {
          cliOutput.error({ title: `Namespace: ${namespace}, No available pods` });
          system.terminateApp();
        }
        let selectedpod: string;
        if (options?.filter) {
          selectedpod = pods.filter((pod: string) => pod.includes(options?.filter)) as any;
          if (selectedpod.length === 0) {
            cliOutput.warn({ title: "No pods found" });
            system.terminateApp();
          }
          selectedpod = selectedpod[0];
        } else {
          selectedpod = await system.promptChoise("Select pod", pods);
        }
        cliOutput.success({ title: `Connecting... ${selectedpod}` });
        await k8s.attachPod(namespace, selectedpod);
        cliOutput.success({ title: "The pod attach operation completed" });
      })
    );
  return k8sPodsCli;
}
