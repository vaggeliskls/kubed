export interface DockerImageDetails {
  registry: string | undefined;
  repository: string;
  tag: string | undefined;
  image: string;
}

export interface IDict {
  [key: string]: string;
}

export enum StateEnum {
  Local = "local",
  K8s = "k8s",
  Off = "off",
}

export class SettingFile {
  ENVIRONMENT = "";
  NAMESPACE = "";
  STATE: StateEnum = StateEnum.Off;
  DEFAULT_TEMPLATE_PATH?: string = "./assets/charts/values";
  EXCLUDE_ENVIRONMENTS: string[] = ["default.json"];
  PACKAGES = {
    KUBECTL: "v1.29.1",
    HELM: "v3.14.0",
    SKOPEO: "v1.14.0",
    K3D: "v5.6.0",
  };
  ARGS = {
    KUBECTL: "",
    HELM: "",
  };
  OVERRIDE = {};
  EXCLUDE = [];
  EXTRA_CHARTS = [];
}

export class Chart {
  apiVersion = "v2";
  name = "single-chart-generator";
  description = "The generic single chart application";
  type = "application";
  version = "0.1.0";
  appVersion = "1.12.0";
  dependencies: {
    name: string;
    version?: string;
    repository?: string;
    condition?: string;
    alias?: string;
  }[] = [];
}

export class ConfigMap {
  apiVersion = "v1";
  kind = "ConfigMap";
  metadata = {
    name: "kubed-global-config",
    namespace: "kubed",
  };
  data: IDict = {};
}

export class Secret {
  apiVersion = "v1";
  kind = "Secret";
  metadata = {
    name: "kubed-global-secret",
    namespace: "kubed",
  };
  type = "Opaque";
  data: IDict = {};
}

export interface IConfigMap {
  name?: string;
  data: IData[];
}

export interface ISecret {
  name?: string;
  data: IData[];
}

export interface IChartsData {
  name: string;
  path: string;
  cache?: string;
  version?: string;
  group: string;
  template?: string;
  wait?: boolean;
  waitForJobs?: boolean;
  timeout?: string;
  priority: number;
  namespace?: string;
  namespaceCreate?: boolean;
  debug?: boolean;
  templateContext?: any;
  images?: string[];
  remote: boolean;
  repository?: string;
  chartTemplateHash?: string;
  type?: "oci" | "http" | "local";
}

export interface ICharts {
  priority: {
    utils: number;
    service: number;
    component: number;
    worker: number;
  };
  data: IChartsData[];
}

export interface IData {
  key: string;
  value: string;
  type?: DataTypeEnum;
  message?: string;
  env?: string;
  length?: number;
  sensitive: boolean;
  display?: boolean;
  lock?: boolean;
  charset?: string[];
}

export enum DataTypeEnum {
  Random = "random",
  Prompt = "prompt",
}

export interface IDeployer {
  namespace: string;
  parent: string;
  Settings: IData[];
  ConfigMap: IConfigMap;
  Secret: ISecret;
  Charts: ICharts;
}
