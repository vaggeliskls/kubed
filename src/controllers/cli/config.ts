import Table from "cli-table3";
import { Command, Option } from "commander";

import { cliOutput, executor } from "../../shared/cli";
import { actionRunner } from "../../shared/errors";
import * as deployer from "../deployer";
import * as k8s from "../kubernetes";

export function configCli(): Command {
  // CONFIG
  const configCli = new Command();
  configCli.name("config").description("General config commands");

  configCli
    .command("cluster")
    .description("Select default cluster context")
    .action(
      actionRunner(async (options: any) => {
        await k8s.selectClusterContext(options?.cluster);
        cliOutput.success({ title: "The default cluster change completed" });
      })
    );

  configCli
    .command("delete-context")
    .description("Delete cluster context")
    .addOption(new Option("-c, --cluster <text>", "Cluster name"))
    .action(
      actionRunner(async (options: any) => {
        const selectedContext = options?.cluster ?? (await k8s.selectClusterContext());
        await k8s.deleteClusterContext(selectedContext);
        cliOutput.success({ title: "The cluster delete completed" });
      })
    );

  configCli
    .command("registry-auth")
    .description("Create registry secret for authentication")
    .option("--env <text>", "Force environment by name")
    .option("--change-env", "Change environment selection", false)
    .addOption(new Option("-r, --registry <text>", "The registry url").makeOptionMandatory(true))
    .addOption(new Option("-n, --namespace <text>", "Namespace to add the secret"))
    .addOption(
      new Option("--name <text>", "Name of image pull secret").default("registry-auth-credentials")
    )
    .addOption(
      new Option("-u, --username <text>", "The username of the registry").makeOptionMandatory(true)
    )
    .addOption(
      new Option("-p, --password <text>", "The password of the registry").makeOptionMandatory(true)
    )
    .action(
      actionRunner(async (options: any) => {
        const selectedEnv = await deployer.selectEnvironment(options.changeEnv, options?.env);
        const envData = deployer.getMergedEnvironment(selectedEnv);
        const namespace = options?.namespace ?? envData.namespace;
        await k8s.createNamespace(namespace);
        await k8s.deleteSecret(options?.name, namespace);
        await executor.runCommandAsync(
          `kubectl create secret --namespace ${namespace} docker-registry ${options?.name} --docker-server=${options?.registry} --docker-username=${options?.username} --docker-password=${options?.password}`
        );
        cliOutput.success({ title: "The registry secret created completed" });
      })
    );

  configCli
    .command("add-aws-cluster")
    .description("Add a aws cluster")
    .addOption(new Option("-c, --cluster <text>", "Cluster name").makeOptionMandatory(true))
    .addOption(new Option("-s, --skip-config", "Skip configure").default(false))
    .action(
      actionRunner(async (options: any) => {
        await k8s.addAwsContext(options?.cluster, options.skipConfig);
        cliOutput.success({ title: "The default cluster change completed" });
      })
    );

  configCli
    .command("add-openshift-cluster")
    .description("Add a openshift cluster")
    .addOption(
      new Option("-c, --cluster <text>", "Control Plane API endpoint").makeOptionMandatory(true)
    )
    .addOption(new Option("-u, --username <text>", "Cluster username"))
    .addOption(new Option("-p, --password <text>", "Cluster password"))
    .action(
      actionRunner(async (options: any) => {
        await k8s.addOpenshiftContext(options?.cluster, options.username, options.password);
        cliOutput.success({ title: "The default cluster change completed" });
      })
    );

  configCli
    .command("add-azure-cluster")
    .description("Add a azure cluster")
    .addOption(new Option("-c, --cluster <text>", "Cluster name").makeOptionMandatory(true))
    .addOption(new Option("-g, --cluster-group <text>", "Cluster group").makeOptionMandatory(true))
    .addOption(new Option("-s, --skip-config", "Skip configure").default(false))
    .action(
      actionRunner(async (options: any) => {
        await k8s.addAzureCluster(options?.cluster, options?.clusterGroup, options.skipConfig);
        cliOutput.success({ title: "The default cluster change completed" });
      })
    );

  configCli
    .command("properties")
    .description("Display config values that include 'display: true' property")
    .addOption(new Option("--env <text>", "Force environment by name"))
    .addOption(new Option("--change-env", "Change environment selection").default(false))
    .action(
      actionRunner(async (options: any) => {
        const selectedEnv = await deployer.selectEnvironment(options.changeEnv, options?.env);
        const envData = deployer.getMergedEnvironment(selectedEnv);
        const displayValues = deployer.getKeysListByProp(envData, "display");
        const deployerValues = await deployer.getDeployerValues(envData);
        const table = new Table();
        const toGreen = cliOutput.colors.green;
        for (const value of displayValues) {
          table.push({
            [`${value}`]: toGreen(deployerValues[value] ?? "Not exist"),
          });
        }
        cliOutput.log({
          title: "Display selected properties",
          bodyLines: [table.toString()],
        });
      })
    );

  configCli
    .command("charts")
    .description("Display environment charts")
    .addOption(new Option("--env <text>", "Force environment by name"))
    .addOption(new Option("--change-env", "Change environment selection").default(false))
    .action(
      actionRunner(async (options: any) => {
        const selectedEnv = await deployer.selectEnvironment(options.changeEnv, options?.env);
        const envData = deployer.getMergedEnvironment(selectedEnv);
        deployer.deploymentInfo(envData);
        const deployerValues = await deployer.getDeployerValues(envData, { localOnly: true });
        const charts = await deployer.getLocalChartsValues(envData, {
          deployerValues,
        });
        const table = new Table({
          head: ["Index", "Name", "Chart", "Version"],
        });
        const toGreen = cliOutput.colors.green;
        let index = 1;
        for (const chart of charts) {
          table.push([
            toGreen(index),
            toGreen(chart.name),
            toGreen(chart.cache || chart.path),
            toGreen(chart.version || "-"),
          ]);
          index++;
        }
        cliOutput.log({
          title: "Display environment charts",
          bodyLines: [table.toString()],
        });
      })
    );

  return configCli;
}
