// Importing necessary modules and interfaces
import * as _ from "lodash";
import path from "path";

import * as system from "../system";

import {
  IDeployer,
  IData,
  DataTypeEnum,
  IDict,
  IChartsData,
  SettingFile,
} from "./environment.model";

const KUBED_RC_FILE = ".configrc.json";

// Function to get settings
export function getSettings(): SettingFile {
  // Open the settings file
  return system.openJsonFile(`./${KUBED_RC_FILE}`) as SettingFile;
}

// Function to set settings
export function setSettings(settings: SettingFile): void {
  // Write the settings to the settings file
  system.writeToFile(`./${KUBED_RC_FILE}`, settings, "json");
}

export function prepareSettings(): void {
  // If the settings file does not exist, create it
  if (!system.pathExists(`./${KUBED_RC_FILE}`)) {
    setSettings(new SettingFile());
  }
}

export function prepareEnvVariables(): void {
  const settings = getSettings();
  process.env["ARGS_HELM"] = settings?.ARGS?.HELM ?? "";
  process.env["ARGS_KUBECTL"] = settings?.ARGS?.KUBECTL ?? "";
}

export function getKubeCtlArgs(): string {
  return process.env["ARGS_KUBECTL"] ?? "";
}

export function getHelmArgs(): string {
  return process.env["ARGS_HELM"] ?? "";
}

// Function to merge array objects by key
export function mergeArrayObjectByKey(
  target: any,
  source: any,
  key = "key"
): IData[] | IChartsData[] {
  // Merge the two arrays by key
  const targetMap = _.keyBy(target, key);
  const sourceMap = _.keyBy(source, key);
  return _.values({ ...targetMap, ...sourceMap });
}

// Function to merge environments
export function mergeEnvironments(defaultEnv: IDeployer, selectedEnv: IDeployer): IDeployer {
  const settings = getSettings();
  // Create a copy of the default environment
  const mergedEnvData = { ...defaultEnv };
  // Replace the namespace with the selected environment's namespace
  mergedEnvData.namespace = settings.NAMESPACE || selectedEnv.namespace;
  // Replace the ConfigMap name with the selected environment's ConfigMap name, if it exists, otherwise use the default environment's ConfigMap name
  mergedEnvData.ConfigMap.name = selectedEnv.ConfigMap?.name ?? defaultEnv.ConfigMap?.name;
  // Replace the Secret name with the selected environment's Secret name, if it exists, otherwise use the default environment's Secret name
  mergedEnvData.Secret.name = selectedEnv.Secret?.name ?? defaultEnv.Secret?.name;
  // Override the default data with the selected environment's ConfigMap data
  mergedEnvData.ConfigMap.data = mergeArrayObjectByKey(
    defaultEnv.ConfigMap.data,
    selectedEnv.ConfigMap.data
  ) as IData[];
  // Override the default data with the selected environment's Secret data
  mergedEnvData.Secret.data = mergeArrayObjectByKey(
    defaultEnv.Secret.data,
    selectedEnv.Secret.data
  ) as IData[];
  // Override the default Settings with the selected environment's Settings
  mergedEnvData.Settings = mergeArrayObjectByKey(
    defaultEnv.Settings,
    selectedEnv.Settings
  ) as IData[];
  // Override the Charts data with the selected environment's Charts data
  mergedEnvData.Charts.data = mergeArrayObjectByKey(
    defaultEnv.Charts.data,
    selectedEnv.Charts.data,
    "name"
  ) as IChartsData[];
  // Return the merged environment
  return mergedEnvData;
}

// Function to get merged environment
export function getMergedEnvironment(envName: string): IDeployer {
  let selectedEnv = system.openJsonFile(`./assets/environment/${envName}.json`) as IDeployer;
  // Open default environment file and selected environment file
  let mergedEnv = selectedEnv;

  // While a parent json exists, merge it
  while (selectedEnv.parent) {
    const parentEnv = system.openJsonFile(
      `./assets/environment/${selectedEnv.parent}`
    ) as IDeployer;
    mergedEnv = mergeEnvironments(parentEnv, mergedEnv);
    selectedEnv = parentEnv;
  }

  return mergedEnv;
}

// Function to parse environment data options
export async function parseEnvironmentDataOptions(
  data: IData[],
  localOnly = false
): Promise<IDict> {
  // Create an empty object to store parsed data
  const parsedData: any = {};
  // Loop through the data array
  for (const obj of data) {
    let value = "";
    // Get the environment value
    const envValue = system.getEnv((obj?.env as string) ?? obj.key);
    // If the type is random or localOnly is true, generate a random string
    if (obj.type === DataTypeEnum.Random || (localOnly && obj.type === DataTypeEnum.Prompt)) {
      value = envValue ?? system.getRandomStr(obj?.length, obj?.charset);
      // If the type is prompt, prompt the user for input
    } else if (obj.type === DataTypeEnum.Prompt) {
      value =
        envValue ??
        (await system.promptText(obj?.message ?? obj.key, true, obj?.sensitive ?? false));
      // Otherwise, use the object's value
    } else {
      value = envValue ?? obj.value;
    }
    // Add the key-value pair to the parsedData object
    parsedData[obj.key] = value;
  }
  // Return the parsed data
  return parsedData;
}

// Function to get local ConfigMap dictionary
export async function getLocalConfigMapDict(
  envData: IDeployer,
  options?: {
    filterByProperty?: string[];
    filterByType?: string[];
    filterByKey?: string[];
    localOnly?: boolean;
    exclude?: string[];
  }
): Promise<IDict> {
  // Create a copy of the environment data
  const envDataCopy = _.cloneDeep(envData);
  // If a filter is provided, filter the ConfigMap data by key
  if (options?.filterByKey?.length ?? 0 > 0) {
    envDataCopy.ConfigMap.data = envDataCopy.ConfigMap.data.filter((obj: IData) =>
      (options?.filterByKey as string[]).includes(obj.key)
    );
  }
  if (options?.filterByType?.length ?? 0 > 0) {
    envDataCopy.ConfigMap.data = envDataCopy.ConfigMap.data.filter((obj: IData) =>
      options?.filterByType?.some(term => obj.type === term)
    );
  }
  if (options?.filterByProperty?.length ?? 0 > 0) {
    envDataCopy.ConfigMap.data = envDataCopy.ConfigMap.data.filter((obj: IData) =>
      options?.filterByProperty?.some(term => Object.prototype.hasOwnProperty.call(obj, term))
    );
  }
  if (options?.exclude?.length ?? 0 > 0) {
    envDataCopy.ConfigMap.data = envDataCopy.ConfigMap.data.filter((obj: IData) =>
      options?.exclude?.every(term => obj.key !== term)
    );
  }
  // Parse the ConfigMap data options
  return await parseEnvironmentDataOptions(envDataCopy.ConfigMap.data, options?.localOnly ?? false);
}

// Function to get local ConfigMap keys
export function getLocalConfigMapKeys(envData: IDeployer): string[] {
  const envDataCopy = _.cloneDeep(envData);
  // Map the ConfigMap data to an array of keys
  return envDataCopy.ConfigMap.data.map((obj: IData) => {
    return obj.key;
  });
}

// Function to get local Secret dictionary
export async function getLocalSecretDict(
  envData: IDeployer,
  options?: {
    filterByProperty?: string[];
    filterByType?: string[];
    filterByKey?: string[];
    localOnly?: boolean;
    exclude?: string[];
  }
): Promise<IDict> {
  // Create a copy of the environment data
  const envDataCopy = _.cloneDeep(envData);
  // If a filter is provided, filter the Secret data by key
  if (options?.filterByKey?.length ?? 0 > 0) {
    envDataCopy.Secret.data = envDataCopy.Secret.data.filter((obj: IData) =>
      (options?.filterByKey as string[]).includes(obj.key)
    );
  }
  if (options?.filterByType?.length ?? 0 > 0) {
    envDataCopy.Secret.data = envDataCopy.Secret.data.filter((obj: IData) =>
      options?.filterByType?.some(term => obj.type === term)
    );
  }
  if (options?.filterByProperty?.length ?? 0 > 0) {
    envDataCopy.Secret.data = envDataCopy.Secret.data.filter((obj: IData) =>
      options?.filterByProperty?.some(term => Object.prototype.hasOwnProperty.call(obj, term))
    );
  }
  if (options?.exclude?.length ?? 0 > 0) {
    envDataCopy.Secret.data = envDataCopy.Secret.data.filter((obj: IData) =>
      options?.exclude?.every(term => obj.key !== term)
    );
  }
  // Parse the Secret data options
  return await parseEnvironmentDataOptions(envDataCopy.Secret.data, options?.localOnly ?? false);
}

// Function to get local Secret keys
export function getLocalSecretKeys(envData: IDeployer): string[] {
  // Map the Secret data to an array of keys
  return envData.Secret.data.map((obj: IData) => {
    return obj.key;
  });
}

// Function to get local Settings dictionary
export async function getLocalSettingsDict(
  envData: IDeployer,
  options?: { exclude?: string[] }
): Promise<IDict> {
  // Parse the Settings data options
  const envDataCopy = _.cloneDeep(envData);
  if (options?.exclude?.length ?? 0 > 0) {
    envDataCopy.Secret.data = envDataCopy.Secret.data.filter((obj: IData) =>
      options?.exclude?.every(term => obj.key !== term)
    );
  }
  return await parseEnvironmentDataOptions(envData.Settings);
}

// Function to get local Charts values
export async function getLocalChartsValues(
  envData: IDeployer,
  options?: {
    wait?: boolean;
    waitForJobs?: boolean;
    timeout?: string;
    group?: string[];
    name?: string[];
    prompt?: boolean;
    find?: string[];
    deployerValues?: IDict;
    nsCreate?: boolean;
  }
): Promise<IChartsData[]> {
  // Create a copy of the environment data
  const envDataCopy = _.cloneDeep(envData);
  // Get the Charts data
  let charts: IChartsData[] = envDataCopy.Charts.data;

  const settings = getSettings();
  const defaultTemplateDirectory = settings.DEFAULT_TEMPLATE_PATH;
  const exludeCharts: string[] = settings?.EXCLUDE ?? [];

  // We add extra charts if they exist
  const extraImportedCharts = settings?.EXTRA_CHARTS ?? [];
  charts.push(
    ...extraImportedCharts.filter(
      (extraChart: IChartsData) =>
        !charts.some((chart: IChartsData) => extraChart.name === chart.name)
    )
  );
  // Apply filters
  if (options?.group?.length ?? 0 > 0) {
    charts = charts.filter(el => options?.group?.includes(el.group));
  }
  if (options?.name?.length ?? 0 > 0) {
    charts = charts.filter(el => options?.name?.includes(el.name));
  }
  if (options?.find?.length ?? 0 > 0) {
    charts = charts.filter(el => options?.find?.some(term => el.name.includes(term)));
  }
  if (exludeCharts.length > 0) {
    charts = charts.filter(
      el => !exludeCharts.some(exclude => el.name.toLowerCase() === exclude.toLowerCase())
    );
  }
  // If prompt is true, prompt the user to select releases
  if (options?.prompt ?? false) {
    const selectedChartNames = await system.promptMultipleChoise(
      "Select releases",
      charts.map(el => el.name)
    );
    charts = charts.filter(el => selectedChartNames.includes(el.name));
  }
  // Loop through the charts
  for (const chart of charts) {
    chart.type = chart.path.includes("oci://")
      ? "oci"
      : chart?.repository?.includes("http://") || chart?.repository?.includes("https://")
        ? "http"
        : "local";
    chart.remote = chart.type === "local" ? false : true;
    const defaultTemplatePath = `${defaultTemplateDirectory}/${chart.name}.template.yaml`;
    // If the default template exists, set it as the chart's template
    const defaultTemplate = system.pathExists(defaultTemplatePath)
      ? defaultTemplatePath
      : undefined;
    chart.template = chart?.template ?? defaultTemplate;
    // Set the chart's priority, namespace, wait, debug, and completed properties
    chart.priority = _.get(envDataCopy, `Charts.priority.${chart?.group}`, 99);
    chart.namespace = chart?.namespace ?? envDataCopy.namespace;
    chart.namespaceCreate = options?.nsCreate ?? false;
    chart.wait = chart?.wait ?? options?.wait ?? false;
    chart.waitForJobs = chart?.waitForJobs ?? options?.waitForJobs ?? false;
    chart.debug = chart?.debug ?? false;
    chart.timeout = chart?.timeout ?? options?.timeout ?? "5m0s";
    // OCI or Remote chart path override
    const cachedPackage = `assets/charts/cache/${path.basename(chart.path)}-${chart?.version}.tgz`;
    chart.cache = chart.remote && system.pathExists(cachedPackage) ? cachedPackage : undefined;
    // ------
    // If deployerValues are provided, render the chart's template
    if (options?.deployerValues && chart?.template) {
      chart.templateContext = chart.template
        ? system.getRenderedTemplate(chart.template, options.deployerValues)
        : undefined;
    }
    chart.chartTemplateHash = system.getHash(JSON.stringify(chart));
  }
  // // Sort the charts by ascending priority
  return charts.sort((first, second) => {
    return first.priority - second.priority;
  });
}

// Function to get environments
export function getEnvironments(type = ".json"): string[] {
  // Get the files in the directory and filter out the default environment
  let files = system.getFilesInDir("./assets/environment").filter(el => el.includes(type));
  const exludedEnvironments = getSettings().EXLUDE_ENVIRONMENTS;
  if (exludedEnvironments?.length ?? 0 > 0) {
    files = files.filter((el: string) => !exludedEnvironments.includes(el));
  }
  files = files.map((el: string) => {
    return el.replace(type, "");
  });
  // Return the list of environment names
  return files;
}

export function getKeysListByProp(envData: IDeployer, property: "display" | "lock"): string[] {
  const settingsValues = envData.Settings.filter(x => x[property]).map(x => x.key);
  const configMapValues = envData.ConfigMap.data.filter(x => x[property]).map(x => x.key);
  const secretValues = envData.Secret.data.filter(x => x[property]).map(x => x.key);
  return system.uniqueArrayValues(
    settingsValues,
    system.uniqueArrayValues(configMapValues, secretValues)
  );
}
