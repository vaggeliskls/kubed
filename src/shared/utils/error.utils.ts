import { isVerbose } from "./env-info.utils.js";

export function mapErrorToBodyLines<TError extends Error>(error: TError): string[] {
  // check if input is an Error instance
  if (!(error instanceof Error)) {
    return [JSON.stringify(error)];
  }

  const lines = [`Error: ${error.message}`];
  if (isVerbose()) {
    lines.push(`Stack: ${error.stack}`);
  }

  return lines;
}
