import { V1Node, V1PersistentVolumeClaim, V1Pod, VersionInfo } from "@kubernetes/client-node";

import { executor } from "../../shared/cli/executor.js";
import { cliOutput } from "../../shared/cli/output.js";
import * as k8s from "../kubernetes/kubernetes.js";
import * as system from "../system/system.js";
import * as prompts from "../system/prompts.js";
import { ConfigMap, IDict, Secret } from "../deployer/environment.model.js";

// Function to select a cluster context
export async function selectClusterContext(clusterName?: string): Promise<string> {
  // Get the default cluster context
  const defaultContext = k8s.getDefaultClusterContext();
  // Get the list of all cluster contexts
  const contextList = k8s.getClusterContextList();
  if (contextList.length === 0) {
    cliOutput.warn({ title: "No available clusters" });
  }
  // Prompt the user to select a context from the list
  const selectedContext =
    clusterName ??
    (await prompts.promptChoise("Cluster Context", contextList, {
      initial: defaultContext,
      skip: contextList.length === 0,
    }));
  // Set the selected context as the active context
  await executor.runCommandAsync(`kubectl config use-context ${selectedContext}`);
  return selectedContext;
}

// Function to delete a cluster context
export async function deleteClusterContext(clusterName?: string): Promise<void> {
  // Get the list of all cluster contexts
  const contextList = k8s.getClusterContextList();
  // Prompt the user to select a context from the list to delete
  const selectedContext =
    clusterName ?? (await prompts.promptChoise("Delete Cluster Context", contextList));
  // Unset the selected context as the active context
  await executor.runCommandAsync(`kubectl config unset contexts.${selectedContext}`);
}

// Function to add an AWS context
export async function addAwsContext(clusterName?: string, skipConfig = false): Promise<void> {
  // Configure AWS CLI
  if (!skipConfig) {
    await executor.runCommandAsync("aws configure", { stdio: "inherit" });
  }
  // Prompt the user to enter the name of the AWS cluster
  const clusterNameSelection = clusterName ?? (await prompts.promptText("AWS Cluster Name"));
  // Update the kubeconfig file with the AWS cluster information
  await executor.runCommandAsync(`aws eks update-kubeconfig --name ${clusterNameSelection}`);
}

// Function to add an openshift context
export async function addOpenshiftContext(
  clusterName?: string,
  clusterUsername?: string,
  clusterPassword?: string
): Promise<void> {
  // Prompt the user to enter the name of the AWS cluster
  const clusterNameSelection =
    clusterName ?? (await prompts.promptText("Control Plane API endpoint"));
  const username = clusterUsername ?? (await prompts.promptText("Username"));
  const password = clusterPassword ?? (await prompts.promptText("Password"));
  // Update the kubeconfig file with the AWS cluster information
  await executor.runCommandAsync(
    `oc login --server=${clusterNameSelection} --username=${username} --password=${password} --insecure-skip-tls-verify`
  );
}

// Function to add an Azure context
export async function addAzureCluster(
  clusterName?: string,
  clusterGroup?: string,
  skipConfig = false
): Promise<void> {
  // Log in to Azure
  if (!skipConfig) {
    await executor.runCommandAsync("az login", { stdio: "inherit" });
  }
  // Prompt the user to enter the name and group of the Azure cluster
  const clusterNameSelection = clusterName ?? (await prompts.promptText("Azure Cluster Name"));
  const clusterGroupSelection = clusterGroup ?? (await prompts.promptText("Azure Cluster Group"));
  // Get the credentials for the Azure cluster and update the kubeconfig file
  await executor.runCommandAsync(
    `az aks get-credentials --name ${clusterNameSelection} -g ${clusterGroupSelection}`
  );
}

export async function podDelete(name: string, namespace: string): Promise<void> {
  try {
    await executor.runCommandAsync(
      `kubectl delete pod --grace-period=0 --force --namespace ${namespace} ${name}`,
      { silent: true }
    );
  } catch (err: any) {
    if (!err?.includes("NotFound")) {
      throw new Error(err);
    }
  }
}

export async function podLogs(namespace: string, pod: string): Promise<void> {
  try {
    await executor.runCommandAsync(`kubectl logs -f -n ${namespace} ${pod}`, { stdio: "inherit" });
  } catch (err: any) {
    if (!(err as string)?.includes("NotFound")) {
      throw new Error(err);
    }
  }
}

export async function describePod(namespace: string, pod: string): Promise<void> {
  try {
    await executor.runCommandAsync(`kubectl describe pod -n ${namespace} ${pod}`, {
      stdio: "inherit",
    });
  } catch (err: any) {
    if (!(err as string)?.includes("NotFound")) {
      throw new Error(err);
    }
  }
}

export async function attachPod(namespace: string, pod: string): Promise<void> {
  try {
    await executor.runCommandAsync(`kubectl exec -i -t -n ${namespace}  ${pod} -- sh`, {
      stdio: "inherit",
    });
  } catch (err: any) {
    system.terminateApp();
  }
}

export async function listPods(namespace?: string): Promise<void> {
  try {
    const ns = namespace ? `-n ${namespace}` : "--all-namespaces";
    await executor.runCommandAsync(`kubectl get pods ${ns}`, {
      stdio: "inherit",
    });
  } catch (err: any) {
    throw new Error(err);
  }
}

export async function execPods(namespace: string, pod: string, cmd: string): Promise<string> {
  try {
    return await executor.runCommandAsync(`kubectl exec -i -t -n ${namespace} ${pod} -- ${cmd}`);
  } catch (err: any) {
    throw new Error(err);
  }
}

export async function setKubeConfigSkipTlsVerify(status = true): Promise<string> {
  try {
    const defaultCluster = k8s.getDefaultClusterName();
    return await executor.runCommandAsync(
      `kubectl config set-cluster ${defaultCluster} --insecure-skip-tls-verify=${status}`
    );
  } catch (err: any) {
    throw new Error(err);
  }
}

export async function createNamespace(namespace: string): Promise<void> {
  try {
    await executor.runCommandAsync(`kubectl create namespace ${namespace}`, {
      silent: true,
    });
  } catch (err: any) {
    if (!(err as string)?.includes("AlreadyExists")) {
      throw new Error(err);
    }
  }
}

export async function deleteNamespace(namespace: string): Promise<void> {
  try {
    await executor.runCommandAsync(`kubectl delete namespace ${namespace}`, {
      silent: true,
    });
  } catch (err: any) {
    if (!(err as string)?.includes("NotFound")) {
      throw new Error(err);
    }
  }
}

export async function createOrPatchConfigMap(
  name: string,
  namespace: string,
  data: IDict
): Promise<void> {
  try {
    const configMap = new ConfigMap();
    configMap.metadata.name = name;
    configMap.metadata.namespace = namespace;
    configMap.data = data;
    await executor.runCommandAsync(`kubectl apply --namespace ${namespace} -f -`, {
      input: JSON.stringify(configMap),
      silent: true,
    });
  } catch (err: any) {
    if (!(err as string)?.includes("NotFound")) {
      throw new Error(err);
    }
  }
}

export async function createOrPatchSecret(
  name: string,
  namespace: string,
  data: IDict
): Promise<void> {
  try {
    const secret = new Secret();
    secret.metadata.name = name;
    secret.metadata.namespace = namespace;
    secret.data = k8s.encodeSecretData(data);
    await executor.runCommandAsync(`kubectl apply --namespace ${namespace} -f -`, {
      input: JSON.stringify(secret),
      silent: true,
    });
  } catch (err: any) {
    if (!(err as string)?.includes("NotFound")) {
      throw new Error(err);
    }
  }
}

export async function deleteConfigMap(name: string, namespace: string): Promise<void> {
  try {
    await executor.runCommandAsync(`kubectl delete configmap ${name} --namespace=${namespace}`, {
      silent: true,
    });
  } catch (err: any) {
    if (!(err as string)?.includes("NotFound")) {
      throw new Error(err);
    }
  }
}

export async function deleteSecret(name: string, namespace: string): Promise<void> {
  try {
    await executor.runCommandAsync(`kubectl delete secret ${name} --namespace=${namespace}`, {
      silent: true,
    });
  } catch (err: any) {
    if (!(err as string)?.includes("NotFound")) {
      throw new Error(err);
    }
  }
}

export async function getConfigMapData(
  name: string,
  namespace: string
): Promise<IDict | undefined> {
  try {
    const data = await executor.runCommandAsync(
      `kubectl get configmap ${name} -o json --namespace=${namespace}`,
      { silent: true }
    );
    const configmap = JSON.parse(data) as ConfigMap;
    return configmap.data;
  } catch (err: any) {
    if ((err as string)?.includes("NotFound")) {
      return undefined;
    } else {
      throw new Error(err);
    }
  }
}

export async function getSecretData(name: string, namespace: string): Promise<IDict | undefined> {
  try {
    const dataStr = await executor.runCommandAsync(
      `kubectl get secret ${name} -o json --namespace=${namespace}`,
      { silent: true }
    );
    const secret = JSON.parse(dataStr) as Secret;
    return k8s.decodeSecretData(secret.data);
  } catch (err: any) {
    if ((err as string)?.includes("NotFound")) {
      return undefined;
    } else {
      throw new Error(err);
    }
  }
}

export async function getPods(namespace?: string): Promise<V1Pod[]> {
  try {
    const sn = namespace ? `-n ${namespace}` : "--all-namespaces";
    const dataStr = await executor.runCommandAsync(`kubectl get pods ${sn} -o json`, {
      silent: true,
    });
    return JSON.parse(dataStr)["items"];
  } catch (err: any) {
    throw new Error(err);
  }
}

export async function getPodsNames(namespace?: string): Promise<string[]> {
  try {
    const pods = await getPods(namespace);
    return pods.map((pod: V1Pod) => pod?.metadata?.name as string);
  } catch (err: any) {
    throw new Error(err);
  }
}

export async function deletePvc(name: string, namespace: string): Promise<void> {
  try {
    await executor.runCommandAsync(`kubectl delete pvc ${name} -n ${namespace}`, {
      silent: true,
    });
  } catch (err: any) {
    throw new Error(err);
  }
}

export async function getPvcS(namespace?: string): Promise<V1PersistentVolumeClaim[]> {
  try {
    const sn = namespace ? `-n ${namespace}` : "--all-namespaces";
    const dataStr = await executor.runCommandAsync(`kubectl get pvc ${sn} -o json`, {
      silent: true,
    });
    return JSON.parse(dataStr)["items"];
  } catch (err: any) {
    throw new Error(err);
  }
}

export async function getPvcSNames(namespace?: string): Promise<string[]> {
  try {
    const pvcs = await getPvcS(namespace);
    return pvcs.map((pvc: V1PersistentVolumeClaim) => pvc.metadata?.name as string);
  } catch (err: any) {
    throw new Error(err);
  }
}

export async function getKubernetesVersion(): Promise<string | undefined> {
  try {
    const dataStr = await executor.runCommandAsync("kubectl version -o json", {
      silent: true,
    });
    const data = JSON.parse(dataStr) as { clientVersion: VersionInfo; serverVersion: VersionInfo };
    return data?.serverVersion?.gitVersion;
  } catch (err) {
    return undefined;
  }
}

export async function getApiVersion(): Promise<string[]> {
  const dataStr = await executor.runCommandAsync("kubectl api-versions", {
    silent: true,
  });
  return dataStr.split("\n").filter(line => line.trim() !== "");
}

export async function getNodeDetails(): Promise<V1Node[]> {
  try {
    const dataStr = await executor.runCommandAsync("kubectl get nodes -o json", {
      silent: true,
    });
    return JSON.parse(dataStr)["items"];
  } catch (err: any) {
    throw new Error(err);
  }
}

export async function isNamespaceExist(namespace: string): Promise<boolean> {
  try {
    await executor.runCommandAsync(`kubectl get namespace ${namespace}`, {
      silent: true,
    });
    return true;
  } catch (err: any) {
    if ((err as string)?.includes("NotFound")) {
      return false;
    } else {
      throw new Error(err);
    }
  }
}
