// Importing necessary modules
import Table from "cli-table3";
import * as _ from "lodash";

import { cliOutput } from "../../shared/cli";
import * as k8s from "../kubernetes";
import * as system from "../system";

import {
  DataTypeEnum,
  IDeployer,
  IDict,
  SettingFile,
} from "./environment.model";
import * as parser from "./parser";

function getPackagedAppDetails(): IDict | any {
  try {
    return system.readEnvFile(`${system.packagedPwd()}/.application`);
  } catch (err) {
    return null;
  }
}

export function getPackagedAppName(): string {
  return getPackagedAppDetails()?.APP_NAME ?? "kubed";
}

export function getPackagedAppVersion(): string {
  return getPackagedAppDetails()?.APP_VERSION ?? "develop";
}

export function getPackagedLogoText(): string {
  return getPackagedAppDetails()?.LOGO_TEXT ?? "";
}

// Function to print the deployer logo
export function printDeployerLogo(): void {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const logo = require("asciiart-logo");
  let deployerLogo = logo({
    name: getPackagedAppName(),
    borderColor: "bold-black",
    logoColor: "magenta",
    textColor: "green",
  });
  // Add extra info on the logo
  if (getPackagedLogoText()) {
    deployerLogo = deployerLogo.right(getPackagedLogoText());
  }
  cliOutput.log({ title: deployerLogo.render() });
}

/**
 * Asynchronously retrieves the deployer values from the environment data.
 * @param envData - The environment data object.
 * @param localOnly - A boolean flag indicating whether to retrieve only local values.
 * @returns A Promise that resolves to an object containing the merged values.
 */
export async function getDeployerValues(
  envData: IDeployer,
  options?: { localOnly?: boolean; exclude?: string[]; override?: string[] }
): Promise<IDict> {
  const localOnly = options?.localOnly ?? false;
  // We exlude properties eather with command args or settings file
  const exclude = _.union(
    options?.exclude ?? [],
    parser.getSettings()?.EXCLUDE ?? []
  );
  const settingsOverride = parser.getSettings()?.OVERRIDE;
  let forceOverrideValues: IDict = {};
  // We override with command arguments
  if (options?.override?.length ?? 0 > 0) {
    const overrideValues = system.readEnvFile(
      (options?.override as any).join("\r\n"),
      false
    );
    forceOverrideValues = Object.assign(
      {},
      forceOverrideValues,
      overrideValues
    );
  }
  // We override with settings file
  if (!_.isEmpty(settingsOverride)) {
    forceOverrideValues = Object.assign(
      {},
      forceOverrideValues,
      settingsOverride
    );
  }
  // Get the namespace, configMapName and secretName from the envData
  const namespace: string = envData.namespace;
  const configMapName = envData.ConfigMap.name as string;
  const secretName = envData.Secret.name as string;
  // Get local settings
  let localSettings = await parser.getLocalSettingsDict(envData, { exclude });
  // We override only the setting key when the override values appear on argumensts or settings file
  if (!_.isEmpty(forceOverrideValues)) {
    localSettings = _.assign(
      localSettings,
      _.pick(forceOverrideValues, _.keys(localSettings))
    );
  }
  let localConfigMapValues: IDict = {};
  let localSecretValues: IDict = {};

  if (localOnly) {
    // Get local values for configMap and secret
    localConfigMapValues = await parser.getLocalConfigMapDict(envData, {
      localOnly,
      exclude,
    });
    localSecretValues = await parser.getLocalSecretDict(envData, {
      localOnly,
      exclude,
    });
  } else {
    // Create namespace if it doesn't exist
    await k8s.createNamespace(namespace);

    // Config Map
    // Get remote values if they exist
    const remoteConfigMapValues = await k8s.getConfigMapData(
      configMapName,
      namespace
    );
    // When we have remote config values
    if (remoteConfigMapValues) {
      localConfigMapValues = remoteConfigMapValues;
      const dynamicValues = await parser.getLocalConfigMapDict(envData, {
        filterByProperty: ["value"],
        exclude: system.uniqueArrayValues(
          exclude,
          parser.getKeysListByProp(envData, "lock")
        ),
      });
      localConfigMapValues = Object.assign(
        {},
        localConfigMapValues,
        dynamicValues
      );
      // We want to keep prompt and random types untouched while update the dynamic config and secret with static values
      // We calculate if there is any new config map that is prompt or random to generate new val while keep the other untouched
      const uniqueKeys = system.uniqueArrayValues(
        Object.keys(remoteConfigMapValues),
        parser.getLocalConfigMapKeys(envData)
      );
      const staticProperties =
        uniqueKeys.length > 0
          ? await parser.getLocalConfigMapDict(envData, {
              filterByType: [DataTypeEnum.Prompt, DataTypeEnum.Random],
              filterByKey: uniqueKeys,
              exclude,
            })
          : {};
      localConfigMapValues = Object.assign(
        {},
        localConfigMapValues,
        staticProperties
      );
      // We override only the setting key when the override values appear on argumensts or settings file
      if (!_.isEmpty(forceOverrideValues)) {
        localConfigMapValues = _.assign(
          localConfigMapValues,
          _.pick(forceOverrideValues, _.keys(localConfigMapValues))
        );
      }
      // Update the config map
      await k8s.createOrPatchConfigMap(
        configMapName,
        namespace,
        localConfigMapValues,
        true
      );
    } else {
      // Get local values for config map
      localConfigMapValues = await parser.getLocalConfigMapDict(envData, {
        exclude,
      });
      // We override only the setting key when the override values appear on argumensts or settings file
      if (!_.isEmpty(forceOverrideValues)) {
        localConfigMapValues = _.assign(
          localConfigMapValues,
          _.pick(forceOverrideValues, _.keys(localConfigMapValues))
        );
      }
      // Create or patch the config map
      await k8s.createOrPatchConfigMap(
        configMapName,
        namespace,
        localConfigMapValues,
        false
      );
    }
    // Secret
    // Get remote values if they exist
    const remoteSecretValues = await k8s.getSecretData(secretName, namespace);
    // When we have remote secret values
    if (remoteSecretValues) {
      localSecretValues = remoteSecretValues;
      const dynamicValues = await parser.getLocalSecretDict(envData, {
        filterByProperty: ["value"],
        exclude: system.uniqueArrayValues(
          exclude,
          parser.getKeysListByProp(envData, "lock")
        ),
      });
      localSecretValues = Object.assign({}, localSecretValues, dynamicValues);
      // We want to keep prompt and random types untouched while update the config and secret with static values
      // We calculate if there is any new config map that is prompt or random to generate new val while keep the other untouched
      const uniqueKeys = system.uniqueArrayValues(
        Object.keys(remoteSecretValues),
        parser.getLocalSecretKeys(envData)
      );
      const staticProperties =
        uniqueKeys.length > 0
          ? await parser.getLocalSecretDict(envData, {
              filterByType: [DataTypeEnum.Prompt, DataTypeEnum.Random],
              filterByKey: uniqueKeys,
              exclude,
            })
          : {};

      localSecretValues = Object.assign(
        {},
        localSecretValues,
        staticProperties
      );
      // We override only the secret key when the override values appear on argumensts or settings file
      if (!_.isEmpty(forceOverrideValues)) {
        localSecretValues = _.assign(
          localSecretValues,
          _.pick(forceOverrideValues, _.keys(localSecretValues))
        );
      }
      await k8s.createOrPatchSecret(
        secretName,
        namespace,
        localSecretValues,
        true
      );
    } else {
      // Generate local values and update remote secret config
      localSecretValues = await parser.getLocalSecretDict(envData, { exclude });
      // We override only the secret key when the override values appear on argumensts or settings file
      if (!_.isEmpty(forceOverrideValues)) {
        localSecretValues = _.assign(
          localSecretValues,
          _.pick(forceOverrideValues, _.keys(localSecretValues))
        );
      }
      // Create or patch the secret
      await k8s.createOrPatchSecret(
        secretName,
        namespace,
        localSecretValues,
        false
      );
    }
  }
  // Return the merged values
  const deployerValues = Object.assign(
    {},
    localSettings,
    localConfigMapValues,
    localSecretValues,
    {
      NAMESPACE: namespace,
      CONFIG_NAME: configMapName,
      SECRET_NAME: secretName,
    }
  );
  return deployerValues;
}

/**
 * This function selects an environment and returns it as a string.
 * @param {boolean} prompt - A boolean that indicates whether the environment needs to be reset.
 * @param {string} environment - The forced environment to use.
 * @returns {Promise<string>} - A promise that resolves to the selected environment.
 */
export async function selectEnvironment(
  prompt = false,
  environment?: string
): Promise<string> {
  // Get environments and settings
  const envs = parser.getEnvironments();
  if (envs.length === 0) {
    cliOutput.error({
      title: "No available environment files (assets/environments/<env>.json)",
    });
    system.terminateApp();
  }
  const settings = parser.getSettings();
  // Check if environment needs to be reset
  // Prompt user to select environment
  if ((!settings.ENVIRONMENT || prompt) && !environment) {
    settings.ENVIRONMENT = await system.promptChoise(
      "Selected environment",
      envs,
      {
        initial: settings.ENVIRONMENT,
      }
    );
  } else {
    settings.ENVIRONMENT = environment ?? settings.ENVIRONMENT;
  }
  parser.setSettings(settings);
  return settings.ENVIRONMENT;
}

export function updateSettings(settings: SettingFile): void {
  const storedSettings = parser.getSettings();
  parser.setSettings(Object.assign({}, storedSettings, settings));
}

// This function takes in an object of type IDeployer and returns a Promise that resolves to void.
export async function deploymentInfo(envData: IDeployer): Promise<void> {
  const table = new Table();
  const toGreen = cliOutput.colors.green;
  const deployerValues = await getDeployerValues(envData, { localOnly: true });

  table.push(
    { Environment: toGreen(parser.getSettings().ENVIRONMENT) },
    { Namespace: toGreen(deployerValues["NAMESPACE"]) },
    { Cluster: toGreen(k8s.getDefaultClusterContext()) },
    { Registry: toGreen(deployerValues["REGISTRY"]) },
    { Charts: toGreen(envData.Charts.data.length) },
    { System: toGreen(`${system.platform()}(${system.arch()})`) }
  );

  cliOutput.log({
    title: "Details",
    bodyLines: [table.toString()],
  });
}

export function preparePackagedFiles(
  assets = ["environment", "charts", "packages", "s3-files", "docs"]
): void {
  if (!system.packaged()) {
    return;
  }
  for (const asset of assets) {
    if (
      !system.pathExists(`./assets/${asset}`) &&
      system.pathExists(`${system.packagedPwd()}/assets/${asset}`)
    ) {
      system.copyPaste(
        `${system.packagedPwd()}/assets/${asset}`,
        `./assets/${asset}`
      );
    }
  }
}

export async function awsLocalConfigure(): Promise<{
  aws_access_key_id: string;
  aws_secret_access_key: string;
  region: string;
  output: string;
}> {
  // https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-shared.html
  // we cannot use it right now to configure aws accounts
  // The reason is that we cannot create a custom function to replace the aws eks update-kubeconfig
  const homeDir = system.getHomeDirectory();
  const credentialsFolder = `${homeDir}/.aws`;
  const credentialsFile = `${credentialsFolder}/credentials`;
  const configFile = `${credentialsFolder}/config`;
  system.createFolder(credentialsFolder);
  let existingCredentials: IDict = {
    aws_access_key_id: "",
    aws_secret_access_key: "",
  };
  let existingConfig: IDict = {
    region: "",
    output: "",
  };
  if (system.pathExists(credentialsFile)) {
    existingCredentials = system.readEnvFile(credentialsFile);
  }
  if (system.pathExists(configFile)) {
    existingConfig = system.readEnvFile(configFile);
  }
  const accessKeyId =
    system.getEnv("AWS_ACCESS_KEY_ID") ??
    (await system.promptText(
      "AWS ACCESS KEY ID",
      true,
      false,
      existingCredentials["aws_access_key_id"]
    ));
  const secretAccessKey =
    system.getEnv("AWS_SECRET_ACCESS_KEY") ??
    (await system.promptText(
      "AWS SECRET ACCESS KEY",
      true,
      true,
      existingCredentials["aws_secret_access_key"]
    ));
  const region =
    system.getEnv("AWS_REGION") ??
    (await system.promptText(
      "AWS REGION",
      true,
      false,
      existingConfig["region"] ?? "eu-west-2"
    ));

  system.writeToFile(
    credentialsFile,
    `[default]
aws_access_key_id = ${accessKeyId}
aws_secret_access_key = ${secretAccessKey}
`
  );

  system.writeToFile(
    configFile,
    `[default]
region = ${region}
output = json
`
  );
  return {
    aws_access_key_id: accessKeyId,
    aws_secret_access_key: secretAccessKey,
    region: region,
    output: "json",
  };
}
