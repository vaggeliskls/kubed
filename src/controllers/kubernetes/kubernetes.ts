import * as k8s from "@kubernetes/client-node";
import path from "path";

import { cliOutput } from "../../shared/cli/output.js";
import { IDict } from "../deployer/environment.model.js";
import * as kubectl from "../kubernetes/kubectl.js";
import { terminateApp, getHomeDirectory } from "../system/system.js";
import * as system from "../system/system.js";

enum StatusMessageEnum {
  Conflict = 409,
  NotFound = 404,
}

export function encodeSecretData(data: IDict): IDict {
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, system.base64Encode(v)]));
}

export function decodeSecretData(data: IDict): IDict {
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, system.base64Decode(v)]));
}

export function getKubeConfig(): k8s.KubeConfig {
  const kc = new k8s.KubeConfig();
  kc.loadFromDefault();
  return kc;
}

export function getApiClient(): k8s.CoreV1Api {
  const kubeconfig = getKubeConfig();
  return kubeconfig.makeApiClient(k8s.CoreV1Api);
}

export async function readNamespaceStatus(
  name: string
): Promise<"Active" | "Terminating" | undefined> {
  try {
    // const k8sApi = getApiClient();
    // const response = await k8sApi.readNamespaceStatus(name);
    // return response?.body?.status?.phase as any;
    return undefined;
  } catch (err: any) {
    // const error = err as k8s.Response;
    // if (error?.statusCode !== StatusMessageEnum.NotFound) {
    //   throw new Error(error?.statusMessage);
    // }
    return undefined;
  }
}

export async function namespaceExists(name: string): Promise<boolean> {
  try {
    const k8sApi = getApiClient();
    // await k8sApi.readNamespace(name);
    return true;
  } catch (err: any) {
    return false;
  }
}

export function getClusterContextList(): string[] {
  const kc = getKubeConfig();
  return kc?.contexts.map((context: k8s.Context) => {
    return context.name;
  });
}

export function getDefaultClusterContext(): string {
  return getKubeConfig().currentContext;
}

export function getDefaultClusterName(): string {
  const kc = getKubeConfig();
  const defaultContext = getDefaultClusterContext();
  const context = kc?.contexts.find(ctx => ctx.name === defaultContext);
  return context?.cluster as string;
}

export function getClusters(): k8s.Cluster[] {
  const kc = getKubeConfig();
  return kc.clusters;
}

export function getClusterInfo(name: string): k8s.Cluster {
  const clusterinfo = getClusters().filter((x: k8s.Cluster) => x.name === name);
  if (clusterinfo.length === 0) {
    cliOutput.warn({ title: "No available clusters" });
    terminateApp();
  }
  return clusterinfo[0];
}

export function getKubeConfigPath(): string | undefined {
  const defaultKubeConfig = path.join(getHomeDirectory(), ".kube", "config");
  const kubeConfigEnv = process.env["KUBECONFIG"];
  if (kubeConfigEnv) {
    return kubeConfigEnv;
  } else {
    return system.pathExists(defaultKubeConfig) ? defaultKubeConfig : undefined;
  }
}

export async function isOpenshift(): Promise<boolean | undefined> {
  try {
    const apiVersions = await kubectl.getApiVersion();
    // Search for security.openshift.io/v1, route.openshift.io/v1,
    // image.openshift.io/v1 or oauth.openshift.io/v1
    return apiVersions.some(str => str.toLowerCase().includes("openshift"));
  } catch (err) {
    return undefined;
  }
}

// export async function getK8sApiVersion(): Promise<string | undefined> {
//   try {
//     const versionApi = getKubeConfig().makeApiClient(k8s.VersionApi);
//     const res = await versionApi.getCode();
//     const serverVersion = res.body.gitVersion; // Extract the server version
//     return serverVersion;
//   } catch (err) {
//     return undefined;
//   }
// }

// export async function getApiVersion(): Promise<string[]> {
//   const k8sApi = getKubeConfig().makeApiClient(k8s.ApisApi);
//   const response = await k8sApi.getAPIVersions();
//   const apiVersions = response.body.groups.map(v => v.name);
//   const groupVersions = response.body.groups.flatMap(group =>
//     group.versions.map(v => v.groupVersion)
//   );
//   return apiVersions.concat(groupVersions);
// }

// export async function createOrPatchConfigMap(
//   name: string,
//   namespace: string,
//   data: IDict,
//   patch = true
// ) {
//   try {
//     const k8sApi = getApiClient();
//     if (patch) {
//       await k8sApi.patchNamespacedConfigMap(
//         name,
//         namespace,
//         { data },
//         undefined,
//         undefined,
//         undefined,
//         undefined,
//         undefined,
//         {
//           headers: { "Content-Type": "application/strategic-merge-patch+json" },
//         }
//       );
//     } else {
//       await k8sApi.createNamespacedConfigMap(namespace, { data, metadata: { name } });
//     }
//   } catch (err: any) {
//     const error = err as k8s.HttpError;
//     if (error?.statusCode === StatusMessageEnum.Conflict) {
//       createOrPatchConfigMap(name, namespace, data, true);
//     } else if (error?.statusCode === StatusMessageEnum.NotFound) {
//       createOrPatchConfigMap(name, namespace, data, false);
//     } else {
//       cliOutput.error({
//         title: "Error creating configmap",
//         bodyLines: mapErrorToBodyLines(error),
//       });
//       throw new Error(err);
//     }
//   }
// }

// export async function deleteSecret(name: string, namespace: string): Promise<void> {
//   try {
//     const k8sApi = getApiClient();
//     await k8sApi.deleteNamespacedSecret(name, namespace);
//   } catch (err: any) {
//     const error = err as k8s.Response;
//     if (error?.statusCode !== StatusMessageEnum.NotFound) {
//       throw new Error(err);
//     }
//   }
// }

// export async function createOrPatchSecret(
//   name: string,
//   namespace: string,
//   data: IDict,
//   patch = true
// ) {
//   try {
//     const k8sApi = getApiClient();
//     if (patch) {
//       await k8sApi.patchNamespacedSecret(
//         name,
//         namespace,
//         { data: encodeSecretData(data) },
//         undefined,
//         undefined,
//         undefined,
//         undefined,
//         undefined,
//         {
//           headers: { "Content-Type": "application/strategic-merge-patch+json" },
//         }
//       );
//     } else {
//       await k8sApi.createNamespacedSecret(namespace, {
//         apiVersion: "v1",
//         kind: "Secret",
//         type: "Opaque",
//         metadata: { name },
//         data: encodeSecretData(data),
//       });
//     }
//   } catch (err: any) {
//     const error = err as k8s.Response;
//     if (error?.statusCode === StatusMessageEnum.Conflict) {
//       createOrPatchSecret(name, namespace, data, true);
//     } else if (error?.statusCode === StatusMessageEnum.NotFound) {
//       createOrPatchSecret(name, namespace, data, false);
//     } else {
//       throw new Error(err);
//     }
//   }
// }

// export async function createNamespace(name: string): Promise<void> {
//   try {
//     const k8sApi = getApiClient();
//     await k8sApi.createNamespace({
//       metadata: {
//         name: name,
//       },
//     });
//   } catch (err: any) {
//     const error = err as k8s.Response;
//     if (error?.statusCode !== StatusMessageEnum.Conflict) {
//       throw new Error(err?.body?.message ?? err);
//     }
//   }
// }

// export async function deleteNamespace(name: string): Promise<void> {
//   try {
//     const k8sApi = getApiClient();
//     await k8sApi.deleteNamespace(name);
//   } catch (err: any) {
//     const error = err as k8s.Response;
//     if (error?.statusCode !== StatusMessageEnum.NotFound) {
//       throw new Error(error?.statusMessage);
//     }
//   }
// }

// export async function getConfigMapData(
//   name: string,
//   namespace: string
// ): Promise<IDict | undefined> {
//   try {
//     const k8sApi = getApiClient();
//     const response = await k8sApi.readNamespacedConfigMap(name, namespace);
//     return response.body.data;
//   } catch (err: any) {
//     const error = err as k8s.Response;
//     if (error?.statusCode === StatusMessageEnum.NotFound) {
//       return undefined;
//     } else {
//       cliOutput.error({
//         title: "Error reading configmap",
//         bodyLines: mapErrorToBodyLines(err),
//       });
//       throw new Error(error?.statusMessage);
//     }
//   }
// }

// export async function getSecretData(name: string, namespace: string): Promise<IDict | undefined> {
//   try {
//     const k8sApi = getApiClient();
//     const response = await k8sApi.readNamespacedSecret(name, namespace);
//     return decodeSecretData(response.body.data as any);
//   } catch (err: any) {
//     const error = err as k8s.Response;
//     if (error?.statusCode === StatusMessageEnum.NotFound) {
//       return undefined;
//     } else {
//       cliOutput.error({
//         title: "Error reading secret",
//         bodyLines: mapErrorToBodyLines(err),
//       });
//       throw new Error(error?.statusMessage);
//     }
//   }
// }

// export async function getPVCNames(namespace: string, filter = ""): Promise<string[]> {
//   const k8sApi = getApiClient();
//   const response = await k8sApi.listPersistentVolumeClaimForAllNamespaces();
//   const pvcsByNamespace = response.body.items.filter(
//     (item: k8s.V1PersistentVolumeClaim) => item.metadata?.namespace === namespace
//   );
//   const pvcsNames = pvcsByNamespace.map((item: k8s.V1PersistentVolumeClaim) => {
//     return item.metadata?.name;
//   }) as string[];
//   return filter ? pvcsNames.filter((item: string) => item.includes(filter)) : pvcsNames;
// }

// export async function getPVNames(
//   namespace: string,
//   filter = ""
// ): Promise<{ name: string; claim: string }[]> {
//   const k8sApi = getApiClient();
//   const response = await k8sApi.listPersistentVolume();
//   const pvByNamespace = response.body.items.filter(
//     (item: k8s.V1PersistentVolume) => item.spec?.claimRef?.namespace === namespace
//   );
//   const pv = pvByNamespace.map((item: k8s.V1PersistentVolume) => {
//     return { name: item.metadata?.name, claim: item.spec?.claimRef?.name };
//   }) as any;
//   return filter ? pv.filter((item: any) => item.claim.includes(filter)) : pv;
// }

// export async function deletePersistentVolumes(names: string[]): Promise<void> {
//   const k8sApi = getApiClient();
//   for (const name of names) {
//     await k8sApi.deletePersistentVolume(name);
//   }
// }

// export async function deletePersistentVolumeClaims(namespace: string, names: string[]) {
//   const k8sApi = getApiClient();
//   for (const name of names) {
//     await k8sApi.deleteNamespacedPersistentVolumeClaim(name, namespace);
//   }
// }

// export async function getAllRunningPodsDetails(
//   namespace: string,
//   onlyRunning = false
// ): Promise<k8s.V1Pod[]> {
//   const k8sApi = getApiClient();

//   const allPods = namespace
//     ? await k8sApi.listNamespacedPod(namespace)
//     : await k8sApi.listPodForAllNamespaces();
//   if (onlyRunning) {
//     allPods.body.items = allPods.body.items.filter(
//       pod =>
//         pod?.status?.phase === "Running" &&
//         pod?.status?.containerStatuses?.some(status => status.ready && status.started)
//     );
//   }
//   return allPods.body.items;
// }

// export async function getAllRunningPods(namespace: string, onlyRunning = false): Promise<string[]> {
//   const allPods = await getAllRunningPodsDetails(namespace, onlyRunning);
//   return (allPods.map((pod: k8s.V1Pod) => pod?.metadata?.name) as string[]) ?? [];
// }

// export async function deleteNamespacedPod(namespace: string, name: string): Promise<void> {
//   const k8sApi = getApiClient();
//   await k8sApi.deleteNamespacedPod(
//     name,
//     namespace,
//     undefined,
//     undefined,
//     0,
//     undefined,
//     "Foreground"
//   );
// }
