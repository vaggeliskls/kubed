import { cliOutput } from "../cli";
import { mapErrorToBodyLines } from "../utils";

function actionErrorHandler(error: Error) {
  cliOutput.error({ title: error.message, bodyLines: mapErrorToBodyLines(error) });
  process.exit(1);
}

export function actionRunner<T = void>(fn: (...args: any[]) => Promise<T>) {
  return (...args: any[]) => fn(...args).catch(actionErrorHandler);
}
