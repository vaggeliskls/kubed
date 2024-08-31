import process from "node:process";

import { cliOutput } from "../../../src/shared/cli";

function findIndexFlag(flag: string): number {
  return process.argv.findIndex(arg => arg === flag || arg.split("=")[0] === flag);
}

function stringify(value?: string): string | undefined {
  return value === "undefined" || value === "null" ? undefined : value;
}

export function getValueByFlag<T extends string>(flag: string, fallback: T): T {
  const index = findIndexFlag(flag);

  if (index === -1) return fallback;

  const [parsedFlag, parsedValue] = process.argv[index].split("=") ?? [];

  const value =
    stringify(parsedValue) ??
    (process.argv[index + 1]?.startsWith("-")
      ? fallback
      : stringify(process.argv[index + 1]) ?? fallback);

  cliOutput.note({
    title: "Parsed flags:",
    bodyLines: [`${[parsedFlag, value || "''"].join("=")}\n`],
  });

  return value as T;
}

export function hasFlag(flag: string): boolean {
  return findIndexFlag(flag) !== -1;
}
