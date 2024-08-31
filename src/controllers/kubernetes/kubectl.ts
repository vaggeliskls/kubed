import { cliOutput, executor } from "../../shared/cli";
import * as k8s from "../kubernetes";
import * as system from "../system";

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
    (await system.promptChoise("Cluster Context", contextList, {
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
    clusterName ?? (await system.promptChoise("Delete Cluster Context", contextList));
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
  const clusterNameSelection = clusterName ?? (await system.promptText("AWS Cluster Name"));
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
    clusterName ?? (await system.promptText("Control Plane API endpoint"));
  const username = clusterUsername ?? (await system.promptText("Username"));
  const password = clusterPassword ?? (await system.promptText("Password"));
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
  const clusterNameSelection = clusterName ?? (await system.promptText("Azure Cluster Name"));
  const clusterGroupSelection = clusterGroup ?? (await system.promptText("Azure Cluster Group"));
  // Get the credentials for the Azure cluster and update the kubeconfig file
  await executor.runCommandAsync(
    `az aks get-credentials --name ${clusterNameSelection} -g ${clusterGroupSelection}`
  );
}

export async function podDelete(namespace: string, name: string, force = false): Promise<void> {
  try {
    if (force) {
      await executor.runCommandAsync(
        `kubectl delete pod --grace-period=0 --force --namespace ${namespace} ${name}`
      );
    } else {
      await k8s.deleteNamespacedPod(namespace, name);
    }
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
    if (!(err as string).includes("NotFound")) {
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
    if (!(err as string).includes("NotFound")) {
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

export async function listPods(): Promise<void> {
  try {
    await executor.runCommandAsync("kubectl get pods --all-namespaces", {
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
