// Importing necessary modules
import * as _ from "lodash";

import { executor } from "../../shared/cli";
import { IChartsData } from "../deployer";
import * as system from "../system";

// we add helm repositories that may not exist
async function repositoryAdd(chart: IChartsData): Promise<void> {
  if (chart?.remote && chart?.repository && chart?.repositoryName) {
    await executor.runCommandAsync(
      `helm repo add ${chart?.repositoryName} ${chart?.repository} --force-update`
    );
  }
}
// Deploy function to deploy a chart
export async function deploy(chart: IChartsData): Promise<void> {
  await repositoryAdd(chart);
  const version = chart.version && chart.remote ? `--version ${chart?.version}` : "";
  // If chart has a template context, set configFile to "-f -", else set it to an empty string
  const configFile = chart.templateContext ? "-f -" : "";
  // If chart has wait flag, set wait to "--wait", else set it to an empty string
  const wait = chart.wait ? "--wait" : "";
  // If chart has wait flag, set wait to "--wait-for-jobs", else set it to an empty string
  const waitForJobs = chart.waitForJobs ? "--wait-for-jobs" : "";
  // if wait of waitforjobs enabled we add timeout
  const timeout = chart.waitForJobs || chart.wait ? `--timeout ${chart.timeout}` : "";
  // If chart has debug flag, set dryRun to "--debug --dry-run", else set it to an empty string
  const dryRun = chart.debug ? "--debug --dry-run" : "";
  // Set cmd to the helm upgrade command with the appropriate flags and chart details
  const cmd = `helm upgrade --install --create-namespace ${dryRun} ${version} --namespace=${chart.namespace} ${wait} ${waitForJobs} ${timeout} ${chart.name} ${chart.path} ${configFile}`;
  // Execute the command using the system module
  await executor.runCommandAsync(cmd, { input: chart.templateContext });
}

// Template function to generate Kubernetes manifests from a chart
export async function template(
  chart: IChartsData,
  options?: { output?: boolean }
): Promise<string> {
  await repositoryAdd(chart);
  const version = chart.version && chart.remote ? `--version ${chart?.version}` : "";
  // If chart has a template context, set configFile to "-f -", else set it to an empty string
  const configFile = chart.templateContext ? "-f -" : "";
  // If chart has debug flag, set dryRun to "--debug --dry-run", else set it to an empty string
  const dryRun = chart.debug ? "--debug --dry-run" : "";
  // Set outputDir to "--output-dir ./templates"
  const outputDir = options?.output ?? true ? "--output-dir ./templates" : "";
  // Set cmd to the helm template command with the appropriate flags and chart details
  const cmd = `helm template ${chart.name} ${chart.path} --namespace=${chart.namespace} ${version} ${dryRun} ${outputDir} ${configFile}`;
  // Execute the command using the system module
  return await executor.runCommandAsync(cmd, {
    input: chart.templateContext,
  });
}

// Update function to update chart dependencies
export async function update(chart: IChartsData): Promise<void> {
  // Set cmd to the helm dependency update command with the chart path
  const cmd = `helm dependency update ${chart.path}`;
  // Execute the command using the system module
  await executor.runCommandAsync(cmd);
}

// Lint function to check chart syntax
export async function lint(chart: IChartsData): Promise<void> {
  await repositoryAdd(chart);
  // If chart has a template context, set configFile to "-f -", else set it to an empty string
  const configFile = chart.templateContext ? "-f -" : "";
  // Set cmd to the helm lint command with the appropriate flags and chart path
  const cmd = `helm lint ${chart.path} ${configFile}`;
  // Execute the command using the system module
  await executor.runCommandAsync(cmd, { input: chart.templateContext });
}

// Uninstall function to uninstall a chart
export async function uninstall(chart: IChartsData): Promise<void> {
  // If chart has debug flag, set dryRun to "--debug --dry-run", else set it to an empty string
  const dryRun = chart.debug ? "--debug --dry-run" : "";
  // Set cmd to the helm uninstall command with the appropriate flags and chart details
  const cmd = `helm uninstall --wait --no-hooks --namespace=${chart.namespace} ${dryRun} ${chart.name}`;
  // Execute the command using the system module
  await executor.runCommandAsync(cmd);
}

// Releases function to get a list of releases in a namespace
export async function getRemoteReleases(namespace: string): Promise<string[]> {
  // Set releases to the output of the helm list command with the appropriate flags and namespace
  const releases = await executor.runCommandAsync(`helm list -a -n ${namespace} --short`);
  // Split the releases string by newline and return the resulting array
  return releases.split("\n").filter(n => n);
}

// ExportReleaseImages function to export images from a chart
export async function exportChartsImages(charts: IChartsData[]): Promise<string[]> {
  const deepSearch = (obj: any, key: string): string[] => {
    if (_.has(obj, key) && typeof obj[key] === "string") {
      return [obj[key]];
    }
    return _.flatten(
      _.map(obj, (v: unknown) => {
        return typeof v === "object" ? deepSearch(v, key) : [];
      })
    );
  };
  let imagesList: string[] = [];
  for (const chart of charts) {
    const templateData = await template(chart, { output: false });
    const parsedTemplate = system.parseMultipleYaml(templateData);
    const chartImages = deepSearch(parsedTemplate, "image");
    const uniqueChartImages = [...new Set(chartImages)];
    imagesList = [...new Set([...imagesList, ...uniqueChartImages])];
  }
  return imagesList;
}
