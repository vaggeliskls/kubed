import { Command } from "commander";

import * as deployer from "./controllers/deployer/deployer.js";
import * as parser from "./controllers/deployer/parser.js";
import {
  KUBED_DRY_RUN,
  KUBED_VERBOSE_LOGGING,
  KUBED_DEBUG,
} from "./shared/constants/process-env.js";
import * as cli from "./controllers/cli/index.js";

async function run() {
  // Prepare packed files
  deployer.preparePackagedFiles();
  // Print logo
  deployer.printDeployerLogo();
  // Prepare settings file
  parser.prepareSettings();
  // Prepare env variables used by the app
  parser.prepareEnvVariables();
  const program = new Command();
  program
    .name("<executable>")
    .description("Kubernetes automatic deployer")
    .addCommand(cli.initCli())
    .addCommand(cli.configCli())
    .addCommand(cli.deployCli())
    .addCommand(cli.bundleCli())
    .addCommand(cli.lintCli())
    .addCommand(cli.updateCli())
    .addCommand(cli.templateCli())
    .addCommand(cli.k8sCli())
    .addCommand(cli.wrappersCLI())
    .addCommand(cli.k3dCli())
    .addCommand(cli.generateCli())
    .option("--verbose", "Display detailed execution information")
    .on("option:verbose", () => (process.env[KUBED_VERBOSE_LOGGING] = "true"))
    .option("--dry-run", "Run without executing commands")
    .on("option:dry-run", () => (process.env[KUBED_DRY_RUN] = "true"))
    .option("--debug", "Display debug information")
    .on("option:debug", () => (process.env[KUBED_DEBUG] = "true"))
    .version(deployer.getPackagedAppVersion());
  program.parse(process.argv);
}

run();
