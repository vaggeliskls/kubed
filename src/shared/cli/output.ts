import * as colorette from "colorette";
import { EOL } from "node:os";
import * as readline from "node:readline";

import * as deployer from "../../controllers/deployer/deployer.js";
import { FINISH_SYMBOL, START_SYMBOL, SUCCESS_SYMBOL } from "../constants/symbols.js";

interface CLIMessageConfig {
  title: string;
  bodyLines?: string[];
}

interface CLIColors {
  magenta: colorette.Color;
  cyan: colorette.Color;
  gray: colorette.Color;
  green: colorette.Color;
  red: colorette.Color;
  white: colorette.Color;
  yellow: colorette.Color;
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
    magenta: colorette.magenta,
    cyan: colorette.cyan,
    gray: colorette.gray,
    green: colorette.green,
    red: colorette.red,
    white: colorette.white,
    yellow: colorette.yellow,
  };

  readonly bold = colorette.bold;
  readonly underline = colorette.underline;
  readonly dim = colorette.dim;

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
    const prefix = `${colorette[color](">")} ${colorette.inverse(colorette.bold(colorette[color](` ${this.cliName} `)))}`;
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
      title: color ? colorette[color](title) : title,
    });

    this.writeOptionalOutputBody(bodyLines);
    this.addNewline();
  }

  error({ title, bodyLines }: CLIMessageConfig) {
    this.addNewline();

    this.writeOutputTitle({
      color: "red",
      title: colorette.red(title),
    });

    this.writeOptionalOutputBody(bodyLines);
    this.addNewline();
  }

  warn({ title, bodyLines }: CLIMessageConfig) {
    this.addNewline();

    this.writeOutputTitle({
      color: "yellow",
      title: colorette.yellow(title),
    });

    this.writeOptionalOutputBody(bodyLines);
    this.addNewline();
  }

  note({ title, bodyLines }: CLIMessageConfig) {
    this.addNewline();

    this.writeOutputTitle({
      color: "gray",
      title: colorette.gray(title),
    });

    this.writeOptionalOutputBody(bodyLines);
    this.addNewline();
  }

  success({ title, bodyLines }: CLIMessageConfig) {
    this.addNewline();

    this.writeOutputTitle({
      color: "green",
      title: colorette.green(title),
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
    return `${this.X_PADDING}${colorette.dim(colorette[color](this.VERTICAL_SEPARATOR))}`;
  }
}

export const cliOutput = new CLIOutput();
