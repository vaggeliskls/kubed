import { Command } from "commander";

import {
  k8sIngressClassCli,
  k8sPodsCli,
  k8sStorageClassCli,
  k8sConfigMapCli,
  k8sPvCCli,
  k8sPvCli,
  k8sSecretCli,
  k8sServiceCli,
} from "./k8s-cil";

export function k8sCli(): Command {
  // DEPLOY
  const k8sCli = new Command();
  k8sCli.name("k8s").description("Kubernetes management system");
  k8sCli.addCommand(k8sPodsCli());
  k8sCli.addCommand(k8sConfigMapCli());
  k8sCli.addCommand(k8sSecretCli());
  k8sCli.addCommand(k8sServiceCli());
  k8sCli.addCommand(k8sIngressClassCli());
  k8sCli.addCommand(k8sStorageClassCli());
  k8sCli.addCommand(k8sPvCCli());
  k8sCli.addCommand(k8sPvCli());
  return k8sCli;
}
