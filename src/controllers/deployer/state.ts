import * as deployer from "../deployer/deployer.js";
import * as system from "../system/system.js";
import * as kubectl from "../kubernetes/kubectl.js";

import { IDict, StateEnum, IChartsData } from "./environment.model.js";
import * as parser from "./parser.js";

const STATE_FILE = ".state";
const k8sStateConfigName = "state-cli-config";

/**
 * Sets the local state by writing the provided data to a file.
 *
 * @param data - An object containing the state data to be written to the file.
 */
function setLocalState(data: IDict): void {
  system.writeToFile(`./${STATE_FILE}`, data, "json");
}

/**
 * Retrieves the local state from a JSON file.
 *
 * @returns {IDict} The local state as an IDict object.
 */
function getLocalState(): IDict | undefined {
  if (!system.pathExists(`./${STATE_FILE}`)) {
    return undefined;
  }
  return system.openJsonFile(`./${STATE_FILE}`) as IDict;
}

/**
 * Resets the local state by deleting the state file.
 *
 * This function deletes the file specified by the `STATE_FILE` constant
 * from the local file system, effectively resetting the local state.
 */
function resetLocalState(): void {
  system.deletePath(`./${STATE_FILE}`);
}

/**
 * Sets the Kubernetes state by creating or patching a ConfigMap with the provided data.
 *
 * @param data - An object containing key-value pairs to be stored in the ConfigMap.
 * @returns A promise that resolves when the operation is complete.
 */
async function setK8sState(data: IDict): Promise<void> {
  const selectedEnv = await deployer.selectEnvironment();
  const envData = parser.getMergedEnvironment(selectedEnv);
  await kubectl.createOrPatchConfigMap(k8sStateConfigName, envData.namespace, data);
}

/**
 * Retrieves the Kubernetes state configuration data.
 *
 * This function selects the current environment, merges the environment data,
 * and then fetches the configuration map data from Kubernetes using the specified
 * configuration name and namespace.
 *
 * @returns {Promise<IDict | undefined>} A promise that resolves to the configuration data as an IDict object, or undefined if not found.
 */
async function getK8sState(): Promise<IDict | undefined> {
  const selectedEnv = await deployer.selectEnvironment();
  const envData = parser.getMergedEnvironment(selectedEnv);
  return await kubectl.getConfigMapData(k8sStateConfigName, envData.namespace);
}

/**
 * Resets the Kubernetes state by deleting the existing ConfigMap.
 *
 * This function selects the environment using the deployer, retrieves the merged environment data,
 * and deletes the ConfigMap associated with the Kubernetes state in the specified namespace.
 *
 * @returns {Promise<void>} A promise that resolves when the Kubernetes state has been reset.
 */
async function resetK8sState(): Promise<void> {
  const selectedEnv = await deployer.selectEnvironment();
  const envData = parser.getMergedEnvironment(selectedEnv);
  await kubectl.deleteConfigMap(k8sStateConfigName, envData.namespace);
}

/**
 * Retrieves the current state type from the settings.
 *
 * @returns {string} The current state type, defaulting to `StateEnum.Off` if not specified.
 */
export function getStateType(): StateEnum {
  const settings = parser.getSettings();
  return settings.STATE ?? StateEnum.Off;
}

/**
 * Sets the state based on the current state type.
 *
 * @param data - The state data to be set.
 * @returns A promise that resolves when the state has been set.
 */
async function setState(data: IDict): Promise<void> {
  const stateType = getStateType();
  if (stateType === StateEnum.K8s) {
    return await setK8sState(data);
  } else {
    return await setLocalState(data);
  }
}

/**
 * Retrieves the current state based on the state type.
 *
 * @returns {Promise<IDict | undefined>} A promise that resolves to the current state,
 * either from a local source or a Kubernetes source, depending on the state type.
 */
async function getState(): Promise<IDict | undefined> {
  const stateType = getStateType();
  if (stateType === StateEnum.K8s) {
    return await getK8sState();
  } else {
    return await getLocalState();
  }
}

/**
 * Resets the state based on the current state type.
 * If the state type is K8s, it resets the local state.
 * Otherwise, it resets the K8s state asynchronously.
 *
 * @returns {Promise<void>} A promise that resolves when the state has been reset.
 */
export async function resetState(): Promise<void> {
  const stateType = getStateType();
  if (stateType === StateEnum.K8s) {
    await resetK8sState();
  } else {
    await resetLocalState();
  }
}

/**
 * Generates a dictionary containing the state data for the given charts.
 *
 * @param charts - An array of chart data objects.
 * @returns A dictionary where the keys are the chart names and the values are the chart template hashes.
 */
function generateStateData(charts: IChartsData[]): IDict {
  const stateData: IDict = {};
  charts.forEach(chart => {
    if (chart.chartTemplateHash) {
      stateData[`${chart.name}`] = chart.chartTemplateHash;
    }
  });
  return stateData;
}

/**
 * Compares two state objects and returns an array of keys that have different values between the new state and the old state.
 *
 * @param newState - The new state object. If undefined, it will be treated as an empty object.
 * @param oldState - The old state object. If undefined, it will be treated as an empty object.
 * @returns A promise that resolves to an array of keys that have different values between the new state and the old state.
 */
async function getChangedChartsNames(
  newState: IDict | undefined,
  oldState: IDict | undefined
): Promise<string[]> {
  newState = newState ?? {};
  oldState = oldState ?? {};
  const getNewStateKeys = Object.keys(newState);
  const changedKeys: string[] = [];
  getNewStateKeys.forEach(key => {
    if (newState[key] !== oldState[key]) {
      changedKeys.push(key);
    }
  });
  return changedKeys;
}

/**
 * Retrieves charts based on the current state.
 *
 * If the state is `Off`, it returns the input charts as is.
 * Otherwise, it generates new state data, compares it with the old state data,
 * and filters the charts to include only those whose names have changed.
 * The new state data is then saved.
 *
 * @param charts - An array of chart data to be processed.
 * @returns A promise that resolves to an array of chart data, potentially filtered based on state changes.
 */
export async function getChartsByState(
  charts: IChartsData[],
  skip = false
): Promise<IChartsData[]> {
  if (getStateType() === StateEnum.Off || skip) {
    return charts;
  }
  const newStateData = generateStateData(charts);
  const oldStateData = await getState();
  const changedChartsNames = await getChangedChartsNames(newStateData, oldStateData);
  await setState(newStateData);
  return charts.filter(el => changedChartsNames.includes(el.name));
}
