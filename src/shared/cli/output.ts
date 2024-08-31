import chalk from "chalk";
import { EOL } from "node:os";
import * as readline from "node:readline";

import * as deployer from "../../controllers/deployer";
import { FINISH_SYMBOL, START_SYMBOL, SUCCESS_SYMBOL } from "../constants";

interface CLIMessageConfig {
  title: string;
  bodyLines?: string[];
}

interface CLIColors {
  magenta: chalk.Chalk;
  cyan: chalk.Chalk;
  gray: chalk.Chalk;
  green: chalk.Chalk;
  red: chalk.Chalk;
  white: chalk.Chalk;
  yellow: chalk.Chalk;
}

type CLIColor = keyof CLIColors;

class CLIOutput {
  readonly X_PADDING = " ";
  readonly cliName = deployer.getPackagedAppName();

  /**
   * Expose some color and other utility functions so that other parts of the codebase that need
   * more fine-grained control of message bodies are still using a centralized implementation.
   */
  readonly colors: CLIColors = {
    magenta: chalk.magenta,
    cyan: chalk.cyan,
    gray: chalk.gray,
    green: chalk.green,
    red: chalk.red,
    white: chalk.white,
    yellow: chalk.yellow,
  };

  readonly bold = chalk.bold;
  readonly underline = chalk.underline;
  readonly dim = chalk.dim;

  readonly SUCCESS_SYMBOL = SUCCESS_SYMBOL;
  readonly START_SYMBOL = START_SYMBOL;
  readonly FINISH_SYMBOL = FINISH_SYMBOL;

  /**
   * Longer dash character which forms more of a continuous line when place side to side
   * with itself, unlike the standard dash character
   */
  private get VERTICAL_SEPARATOR() {
    let divider = "";
    for (let i = 0; i < process.stdout.columns - this.X_PADDING.length * 2; i++) {
      divider += "\u2014";
    }
    return divider;
  }

  overwriteLine(lineText = "") {
    // this replaces the existing text up to the new line length
    process.stdout.write(lineText);
    // clear whatever text might be left to the right of the cursor (happens
    // when existing text was longer than new one)
    readline.clearLine(process.stdout, 1);
    process.stdout.write(EOL);
  }

  applyPrefix(color: CLIColor = "magenta", text: string): string {
    const prefix = `${chalk[color](">")} ${chalk.reset.inverse.bold[color](` ${this.cliName} `)}`;
    return `${prefix}  ${text}`;
  }

  addNewline() {
    this.writeToStdOut(EOL);
  }

  addVerticalSeparator(color: CLIColor = "gray") {
    this.addNewline();
    this.addVerticalSeparatorWithoutNewLines(color);
    this.addNewline();
  }

  addVerticalSeparatorWithoutNewLines(color: CLIColor = "gray") {
    this.writeToStdOut(`${this.getVerticalSeparator(color)}${EOL}`);
  }

  getVerticalSeparatorLines(color: CLIColor = "gray") {
    return ["", this.getVerticalSeparator(color), ""];
  }

  log({ title, bodyLines, color }: CLIMessageConfig & { color?: CLIColor }) {
    this.addNewline();

    this.writeOutputTitle({
      color: "magenta",
      title: color ? chalk[color](title) : title,
    });

    this.writeOptionalOutputBody(bodyLines);
    this.addNewline();
  }

  error({ title, bodyLines }: CLIMessageConfig) {
    this.addNewline();

    this.writeOutputTitle({
      color: "red",
      title: chalk.red(title),
    });

    this.writeOptionalOutputBody(bodyLines);
    this.addNewline();
  }

  warn({ title, bodyLines }: CLIMessageConfig) {
    this.addNewline();

    this.writeOutputTitle({
      color: "yellow",
      title: chalk.yellow(title),
    });

    this.writeOptionalOutputBody(bodyLines);
    this.addNewline();
  }

  note({ title, bodyLines }: CLIMessageConfig) {
    this.addNewline();

    this.writeOutputTitle({
      color: "gray",
      title: chalk.gray(title),
    });

    this.writeOptionalOutputBody(bodyLines);
    this.addNewline();
  }

  success({ title, bodyLines }: CLIMessageConfig) {
    this.addNewline();

    this.writeOutputTitle({
      color: "green",
      title: chalk.green(title),
    });

    this.writeOptionalOutputBody(bodyLines);
    this.addNewline();
  }

  drain(): Promise<void> {
    return new Promise(resolve => {
      if (process.stdout.writableNeedDrain) {
        process.stdout.once("drain", resolve);
      } else {
        resolve();
      }
    });
  }

  logSingleLine(message: string) {
    this.writeToStdOut(`${message}${EOL}`);
  }

  private writeToStdOut(str: string) {
    process.stdout.write(str);
  }

  private writeOutputTitle({ color, title }: { color: CLIColor; title: string }): void {
    this.writeToStdOut(` ${this.applyPrefix(color, title)}${EOL}`);
  }

  private writeOptionalOutputBody(bodyLines?: string[]): void {
    if (!bodyLines) return;

    this.addNewline();
    bodyLines.forEach(bodyLine => this.writeToStdOut(`${bodyLine}${EOL}`));
  }

  private getVerticalSeparator(color: CLIColor): string {
    return `${this.X_PADDING}${chalk.dim[color](this.VERTICAL_SEPARATOR)}`;
  }
}

export const cliOutput = new CLIOutput();
