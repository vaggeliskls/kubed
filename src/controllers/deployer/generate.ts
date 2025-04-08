// Importing necessary modules
import path from "path";

import { executor } from "../../shared/cli/executor.js";
import { isDryRun } from "../../shared/utils/env-info.utils.js";
import * as helm from "../kubernetes/helm.js";
import * as k8s from "../kubernetes/kubernetes.js";
import * as system from "../system/system.js";

import * as deployer from "./deployer.js";
import { Chart, ConfigMap, IDict, Secret } from "./environment.model.js";
import * as parser from "./parser.js";

async function generateConfigSecret(
  chartTemplatesPath: string,
  deployerValues: IDict
): Promise<void> {
  const selectedEnv = await deployer.selectEnvironment(false);
  const envData = parser.getMergedEnvironment(selectedEnv);
  // Prepare configMap and secret
  const configMapKeys = envData.ConfigMap.data.map(el => el.key);
  const secretKeys = envData.Secret.data.map(el => el.key);
  const configMapDict = Object.fromEntries(
    Object.entries(deployerValues).filter(([key]) => configMapKeys.includes(key))
  );
  const secretDict = Object.fromEntries(
    Object.entries(deployerValues).filter(([key]) => secretKeys.includes(key))
  );
  const configMap = new ConfigMap();
  configMap.metadata.namespace = "{{ .Release.Namespace }}";
  configMap.metadata.name = deployerValues["CONFIG_NAME"];
  configMap.data = configMapDict;
  const secret = new Secret();
  secret.metadata.namespace = "{{ .Release.Namespace }}";
  secret.metadata.name = deployerValues["SECRET_NAME"];
  secret.data = k8s.encodeSecretData(secretDict);
  system.writeToFile(`${chartTemplatesPath}/configMap.yaml`, configMap, "yaml");
  system.writeToFile(`${chartTemplatesPath}/secret.yaml`, secret, "yaml");
}

export async function singleChart(chart: Chart): Promise<void> {
  // define paths
  const chartFolder = "./single-chart";
  system.deletePath(chartFolder);
  const chartFilePath = `${chartFolder}/Chart.yaml`;
  const chartTemplatesPath = `${chartFolder}/templates`;
  const chartSubChartsPath = `${chartFolder}/charts`;
  system.deletePath(chartFolder);
  system.createFolder(chartFolder);
  system.createFolder(chartTemplatesPath);
  system.createFolder(chartSubChartsPath);
  // To deploy the exported helm chart
  const selectedEnv = await deployer.selectEnvironment(false);
  const envData = parser.getMergedEnvironment(selectedEnv);
  deployer.deploymentInfo(envData);
  const deployerValues = await deployer.getDeployerValues(envData, { localOnly: true });
  // Get local charts values
  const charts = await parser.getLocalChartsValues(envData, { deployerValues });
  // Prepare configMap and secret
  await generateConfigSecret(chartTemplatesPath, deployerValues);
  const singleChartValues = {} as any;
  let singleChartGlobalValues = {} as any;
  const chartYml = chart;

  for (const chart of charts) {
    const chartName = path.basename(chart.path);
    if (chart.type === "local") {
      const localChartYaml = system.openYamlFile(`${chart.path}/Chart.yaml`) as Chart;
      system.copyPaste(chart.path, `${chartSubChartsPath}/${localChartYaml.name}`);
      chartYml.dependencies.push({
        name: localChartYaml.name,
        version: localChartYaml.version,
        alias: chart.name,
      });
    } else if (chart.type === "http") {
      chartYml.dependencies.push({
        name: chartName,
        version: chart.version,
        repository: chart.repository,
        alias: chart.name,
      });
    } else {
      chartYml.dependencies.push({
        name: chartName,
        version: chart.version,
        repository: chart.path.replace(`/${chartName}`, ""),
        alias: chart.name,
      });
    }
    const chartValues = system.parseYaml(chart.templateContext) as any;
    // merge global properties
    singleChartGlobalValues = { ...singleChartGlobalValues, ...(chartValues["global"] || {}) };
    delete chartValues["global"];
    singleChartValues["global"] = singleChartGlobalValues;
    // create object per chart
    singleChartValues[chart.name] = chartValues;
  }
  system.writeToFile(`${chartFolder}/values.yaml`, singleChartValues, "yaml");
  system.writeToFile(`${chartFilePath}`, chartYml, "yaml");

  if (!isDryRun()) {
    await executor.runCommandAsync(`helm dependency update ${chartFolder}`);
    await helm.template({ path: chartFolder } as any, { output: false });
  }
}
