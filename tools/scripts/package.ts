import { cliOutput, executor } from "../../src/shared/cli";

import { hasFlag, getValueByFlag } from "./shared/argv.utils";
import { packageJson } from "./shared/package-json-manager";

const OS_FLAG = "--os";
const WITH_DEPS_FLAG = "--with-deps";

const SUPPORTED_OS = [
  "linux:amd64",
  "linux:arm64",
  "darwin:amd64",
  "darwin:arm64",
  "windows:amd64",
];

function parseOs(): { name: string; arch: string } {
  try {
    const os = getValueByFlag<string>(OS_FLAG, "");

    // if --os flag is not present, then we throw an error
    if (!os) throw new Error("OS is not specified.");

    // if --os flag is present, we check if it is supported
    if (!SUPPORTED_OS.includes(os)) throw new Error(`Unsupported OS: ${os}`);

    const [name, arch] = os.split(":");
    return { name, arch };
  } catch (error) {
    cliOutput.error({
      title: error.message,
      bodyLines: [
        `Example: ${OS_FLAG}=${SUPPORTED_OS[0]}`,
        `Supported OS: ${SUPPORTED_OS.map(
          (os) => `\n${cliOutput.X_PADDING}- ${os}`
        )}`,
      ],
    });
    process.exit(1);
  }
}

async function packageApp(
  os: string,
  arch: string,
  isOffline: boolean
): Promise<string> {
  const osMap = { linux: "linuxstatic", darwin: "macos", windows: "win" };
  const archMap = { amd64: "x64", arm64: "arm64" };

  const appVersion = process.env.APP_VERSION || packageJson.getVersion();
  const appNamePrefix = process.env.APP_NAME || "kubed";
  const offlineMarker = isOffline ? "-offline" : "";
  const extension = os === "windows" ? ".exe" : "";
  // e.g kubed-1.0.0-linux-x64 or kubed-1.0.0-linux-x64-offline
  const appName = `${appNamePrefix.toLowerCase()}-${appVersion}-${os}-${arch}${offlineMarker}${extension}`;

  const nodeVersion = packageJson.getNodeMajorVersion();
  const target = `node${nodeVersion}-${osMap[os]}-${archMap[arch]}`;

  executor.runCommand(
    `pkg -c package.json --compress GZip -t ${target} -o bin/${appName} dist/index.js`
  );

  return appName;
}

(async function main(): Promise<void> {
  const { name: os, arch } = parseOs();
  const withDeps = hasFlag(WITH_DEPS_FLAG);

  cliOutput.log({
    title: `${cliOutput.START_SYMBOL} Start packaging...`,
    bodyLines: [
      `OS: ${os}`,
      `Arch: ${arch}`,
      `Package dependencies: ${withDeps}`,
    ],
  });

  // build the app
  executor.runCommand("npm run build:ncc");

  // delete the old packages folder
  executor.runCommand("npx rimraf assets/packages");
  // download dependencies if needed
  if (withDeps) {
    executor.runCommand(
      `npm run start:prod -- init --all --os ${os} --arch ${arch}`
    );
  }

  // finally, package the app with pkg
  const appName = await packageApp(os, arch, withDeps);

  cliOutput.success({
    title: `${cliOutput.FINISH_SYMBOL} App is packaged successfully!`,
    bodyLines: [
      `App name: ${appName}`,
      `OS: ${os}`,
      `Arch: ${arch}`,
      `Package dependencies: ${withDeps}`,
    ],
  });
})();
