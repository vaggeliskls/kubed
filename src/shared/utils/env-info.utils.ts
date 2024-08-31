import { KUBED_DRY_RUN, KUBED_VERBOSE_LOGGING } from "../constants";

export function isVerbose() {
  return process.env[KUBED_VERBOSE_LOGGING] === "true";
}

export function isDryRun() {
  return process.env[KUBED_DRY_RUN] === "true";
}

export function getStrippedEnvironmentVariables() {
  return Object.fromEntries(
    Object.entries(process.env).filter(([key]) => {
      if (key.startsWith("KUBED_")) {
        return false;
      }

      return true;
    })
  );
}
