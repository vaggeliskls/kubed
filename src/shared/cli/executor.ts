import { ExecSyncOptions, execSync, spawn } from "node:child_process";
import { Readable } from "node:stream";

import { getHelmArgs, getKubeCtlArgs } from "../../controllers/deployer";
import {
  containsWord,
  pathExists,
  platform,
  pwd,
  replaceWholeWord,
} from "../../controllers/system";
import * as system from "../../controllers/system";
import { getStrippedEnvironmentVariables, isDryRun, isVerbose } from "../utils";

import { cliOutput } from "./output";

interface RunCommandOptions extends Partial<ExecSyncOptions> {
  failOnError?: boolean;
  exitOnError?: boolean;
}

interface RunCommandAsyncOptions {
  env?: ExecSyncOptions["env"];
  silent?: boolean;
  stdio?: "pipe" | "inherit" | "ignore";
  input?: string;
}

class Executor {
  runCommand(command: string, options?: RunCommandOptions): string {
    const dryRun = isDryRun();
    const { failOnError = true, exitOnError = true, ...childProcessOptions } = options ?? {};
    // Replace specific commands with local packages
    command = this.cmdReplaceWithLocalPackages(command);

    try {
      this.logCommandHeader(command, dryRun);

      // If this is a dry run, don't actually run the command.
      if (dryRun) return "";

      const result = execSync(command, {
        cwd: process.cwd(),
        stdio: "pipe",
        encoding: "utf-8",
        env: {
          ...getStrippedEnvironmentVariables(),
          ...childProcessOptions?.env,
          FORCE_COLOR: "false",
        },
        ...childProcessOptions,
      });

      if (isVerbose()) {
        cliOutput.log({
          title: `Command: ${command}`,
          bodyLines: [cliOutput.colors.gray(result as string)],
          color: "green",
        });
      }

      return result as string;
    } catch (error) {
      const e = error as { stdout: string; stderr: string };

      cliOutput.error({
        title: `Command failed: ${command}`,
        bodyLines: [e.stdout, e.stderr],
      });

      // If the command failed, but we don't want to fail the process, return the output.
      if (!failOnError && (e.stdout || e.stderr)) {
        return e.stdout + e.stderr;
      }

      // If the command failed, and we want to fail the process, exit immediately.
      if (exitOnError) {
        process.exit(1);
      }

      // If the command failed, and we don't want to fail the process, throw an error.
      throw e;
    }
  }

  runCommandAsync(command: string, options?: RunCommandAsyncOptions): Promise<string> {
    const dryRun = isDryRun();
    const { silent = !isVerbose(), env = {}, stdio = "pipe", input } = options ?? {};
    // Replace specific commands with local packages
    command = this.cmdReplaceWithLocalPackages(command);

    return new Promise((resolve, reject) => {
      if (isVerbose()) this.logCommandHeader(command, dryRun);

      // If this is a dry run, don't actually run the command.
      if (dryRun) return resolve("");

      // Spawn a child process with the given command and options.
      const cp = spawn(command, {
        shell: true,
        env: {
          ...getStrippedEnvironmentVariables(),
          ...env,
          FORCE_COLOR: "false",
        },
        detached: false,
        stdio,
      });

      let stdoutData = "";
      let stderrData = "";

      // Listen for data on the stdout stream.
      cp.stdout?.on("data", chunk => {
        const data = chunk;
        stdoutData += data;

        if (!silent) this.logCommandOutput(data);
      });

      // Listen for data on the stderr stream.
      cp.stderr?.on("data", chunk => {
        const data = chunk.toString().trim();
        stderrData += data;

        if (!silent) this.logCommandOutput(data);
      });

      // Listen for the error event on the child process.
      cp.on("error", error => {
        reject(error);
      });

      // Listen for the close event on the child process.
      cp.on("close", code => {
        if (code !== 0) {
          reject(stderrData || `Unknown error occurred while running "${command}"`);
        } else {
          resolve(stdoutData);
        }
      });

      // If the input option is set, pass the input to the child process.
      // This is useful for commands that require input from other commands (stdin).
      if (input) {
        const readable = new Readable();
        readable._read = function noop() {};
        readable.push(input);
        readable.push(null);
        readable.pipe(cp.stdin as NodeJS.WritableStream);
      }
    });
  }

  private cmdReplaceWithLocalPackages(cmd: string): string {
    const packagesFolder = `${pwd()}/assets/packages`;
    const extention = platform() === "win32" ? ".exe" : "";
    // remove duplicate spaces and trim
    let replacedCmd = system.removeDuplicateSpaces(cmd);
    const localPackages = ["helm", "kubectl", "skopeo", "k3d"];
    const helmArgs = getHelmArgs();
    const kubectlArgs = getKubeCtlArgs();
    for (const localPackage of localPackages) {
      if (containsWord(cmd, localPackage)) {
        const localPackagePath = `${packagesFolder}/${localPackage}${extention}`;
        replacedCmd = pathExists(localPackagePath)
          ? replaceWholeWord(localPackage, localPackagePath, replacedCmd)
          : replacedCmd;
        // Add extra advanced arguments to helm commants
        replacedCmd =
          localPackage === "helm" && helmArgs
            ? system.addStringAfterNthWord(replacedCmd, helmArgs, 2)
            : replacedCmd;
        // Add extra advanced arguments to kubectl commants
        replacedCmd =
          localPackage === "kubectl" && kubectlArgs
            ? system.addStringAfterNthWord(replacedCmd, kubectlArgs, 2)
            : replacedCmd;
      }
    }
    return replacedCmd;
  }

  private logCommandHeader(command: string, dryRun: boolean) {
    const dryRunMessage = cliOutput.colors.yellow(
      "NOTE: The 'dryRun' flag is enabled. This command will not be executed."
    );

    cliOutput.log({
      title: `Executing command: ${cliOutput.bold(command)}`,
      bodyLines: dryRun ? [dryRunMessage] : [],
    });
  }

  private logCommandOutput(output: string) {
    cliOutput.logSingleLine(cliOutput.dim(output));
  }
}

export const executor = new Executor();
