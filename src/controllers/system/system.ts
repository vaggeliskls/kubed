// Import necessary modules
import axios from "axios";
import fs from "fs";
import fse from "fs-extra";
import { decode } from "html-entities";
import yaml from "js-yaml";
import nunjucks from "nunjucks";
import os from "os";
import path from "path";
import randomstring from "randomstring";

import { executor } from "../../shared/cli";
import { DockerImageDetails, IDict } from "../deployer";

/**
 * Check if a file or folder exists
 * @param path - The path to the file or folder to check
 * @returns True if the file or folder exists, false otherwise
 */
export function pathExists(path: string): boolean {
  return fs.existsSync(path);
}

export function containsWord(text: string, word: string): boolean {
  // return new RegExp(`\\b${word}\\b`, "i").test(text)
  return !!text.split(" ").find((el: string) => el === word);
}

export function replaceWholeWord(word: string, replaceWith: string, text: string): string {
  const parsedText = text
    .trim()
    .split(" ")
    .map((el: string) => (el === word ? replaceWith : el));
  return parsedText.join(" ");
}

/**
 * Open a file and return its contents as a string
 * @param file - The file to open
 * @returns The contents of the file as a string
 */
export function openFile(file: string): string {
  const buffer = fs.readFileSync(file);
  return buffer.toString();
}

export function packaged(): boolean {
  return (process as any)?.pkg ? true : false;
}

export function platform(): NodeJS.Platform {
  return process.platform;
}

export function removeTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export function pwd(): string {
  // https://github.com/vercel/pkg#snapshot-filesystem
  const pwdPath = packaged() ? process.cwd() : path.join(__dirname, "../../../");
  return removeTrailingSlash(pwdPath);
}

/**
 * This function creates a folder at the specified path if it does not already exist.
 * @param  {string} path
 */
export function createFolder(path: string): void {
  if (!pathExists(path)) {
    // If the folder does not exist, create it recursively
    fs.mkdirSync(path, { recursive: true });
  }
}

/**
 * Export a function that writes to a file
 * @param  {string} file
 * @param  {any} content
 * @param  {"text"|"json"|"yaml"="text"} format
 */
export function writeToFile(
  file: string,
  content: any,
  format: "text" | "json" | "yaml" = "text"
): void {
  let parsedContext = "";

  // If the format is JSON, parse the content and format it with 2 spaces
  if (format === "json") {
    parsedContext = JSON.stringify(content, null, 2);
  }
  // If the format is YAML, dump the content
  else if (format === "yaml") {
    parsedContext = yaml.dump(content);
  }
  // If the format is text, set the parsed context to the content
  else {
    parsedContext = content.replace("/&#39;/g", "'");
  }
  // Write the parsed context to the file
  fs.writeFileSync(file, parsedContext);
}

/**
 * Append content to a file
 * @param file - The file to append to
 * @param content - The content to append
 */
export function appendToFile(file: string, content: any): void {
  fs.appendFileSync(file, `\n${content}`);
}

/**
 * Prepend content to a file
 * @param file - The file to prepend to
 * @param content - The content to prepend
 */
export function prependToFile(file: string, content: string): void {
  const data = pathExists(file) ? openFile(file) : "";
  writeToFile(file, `${content}\n${data}`);
}

/**
 * Open a JSON file and return its contents as an object
 * @param file - The file to open
 * @returns The contents of the file as an object
 */
export function openJsonFile(file: string): object {
  return JSON.parse(openFile(file));
}

/**
 * Parse yaml
 * @param contents - The contents of yaml
 * @param pts - The parameters of yaml.load yaml.LoadOptions | undefined
 * @returns The contents of the file as an object
 */
export function parseYaml(contents: string, pts?: yaml.LoadOptions | undefined): unknown {
  return yaml.load(contents, pts);
}

/**
 * Parse yaml multi-document sources
 * @param contents - The contents of yaml
 * @returns The contents of the file as an object
 */
export function parseMultipleYaml(contents: string): unknown {
  return yaml.loadAll(contents);
}

/**
 * Open a YAML file and return its contents as an object
 * @param file - The file to open
 * @returns The contents of the file as an object
 */
export function openYamlFile(file: string, pts?: yaml.LoadOptions | undefined): unknown {
  return parseYaml(fs.readFileSync(file, "utf8"), pts);
}

/**
 * Delete a file or folder
 * @param path - The path to the file or folder to delete
 */
export function deletePath(path: string): void {
  if (pathExists(path)) {
    fs.rmSync(path, { recursive: true, force: true });
  }
}

/**
 * Extract a tar file to a specified output path
 * @param path - The path to the tar file
 * @param outputPath - The path to extract the tar file to
 */
export async function extractTarFile(
  path: string,
  outputPath: string,
  options?: { strip?: boolean; silent?: boolean; exclude?: string[] }
): Promise<void> {
  if (pathExists(path)) {
    createFolder(outputPath);
    const strip = options?.strip ?? false ? "--strip-components=1" : "";
    const cmdFilter = (options?.exclude ?? [])
      .map((filter: string) => `--exclude=${filter}`)
      .join(" ");

    await executor.runCommandAsync(
      `tar -xf ${path} -C ${outputPath} ${strip} ${cmdFilter}`,
      options
    );
  }
}

/**
 * Terminate the current application
 */
export function terminateApp(): never {
  process.exit(1);
}

/**
 * Generate a random string
 * @param length - The length of the string to generate
 * @returns A random string of the specified length
 */
export function getRandomStr(length = 25): string {
  return randomstring.generate({ length, charset: "alphabetic" });
}

/**
 * Get the value of an environment variable
 * @param name - The name of the environment variable
 * @returns The value of the environment variable, or undefined if it does not exist
 */
export function getEnv(name: string): string | undefined {
  return process.env[name];
}

/**
 * Get the unique values of two arrays
 * @param arr1 - The first array
 * @param arr2 - The second array
 * @returns An array containing the unique values of both input arrays
 */
export function uniqueArrayValues(arr1: string[], arr2: string[]): string[] {
  const unique1 = arr1.filter(o => !arr2.includes(o));
  const unique2 = arr2.filter(o => !arr1.includes(o));
  return unique1.concat(unique2);
}

/**
 * Get the files in a directory
 * @param dir - The directory to get the files from
 * @returns An array containing the names of the files in the directory
 */
export function getFilesInDir(dir: string): string[] {
  return fs.readdirSync(dir);
}

/**
 * Render a Nunjucks template with the specified values
 * @param path - The path to the Nunjucks template
 * @param values - The values to render the template with
 * @returns The rendered template as a string
 */
export function getRenderedTemplate(path: string, values: IDict): string {
  return decode(nunjucks.render(path, values));
}

/**
 * Parse a Docker image URL and return its details
 * @param url - The URL of the Docker image
 * @returns An object containing the details of the Docker image
 */
export function dockerImageProcess(url: string): DockerImageDetails {
  const details = {} as DockerImageDetails;
  const splittedImage = url.split("/");
  details.registry = splittedImage.length > 1 ? splittedImage[0] : undefined;
  details.tag = url.replace(`${details.registry}/`, "").split(":")[1];
  details.repository = url.replace(`${details.registry}/`, "").replace(`:${details.tag}`, "");
  details.image = url;
  return details;
}

/**
 * Generate a random integer between two values
 * @param min - The minimum value for the random integer
 * @param max - The maximum value for the random integer
 * @returns A random integer between the specified minimum and maximum values
 */
export function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min);
}

export function arch(): NodeJS.Architecture {
  return process.arch;
}

export function packagedPwd(): string {
  return removeTrailingSlash(path.join(__dirname, "../"));
}

export function copyPaste(
  source: string,
  target: string,
  options?: { override?: boolean; filter?: fse.CopyFilterSync | undefined }
): void {
  fse.copySync(source, target, { overwrite: options?.override ?? true, filter: options?.filter });
}

export async function downloadFile(url: string, targetPath: string): Promise<void> {
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });
  const writer = fs.createWriteStream(targetPath);
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

export function deleteKeysFromDict(keys: string[], dict: any): Promise<void> {
  const dictCopy = Object.assign({}, dict);
  for (const key of dictCopy) {
    delete dictCopy[key];
  }
  return dictCopy;
}

export function getHomeDirectory(): string {
  const homedir = os.homedir();
  return homedir;
}

export function readEnvFile(file: string, fileRead = true): IDict {
  // https://dev.to/sktanwar2014/load-or-set-environment-variables-in-nodejs-without-dotenv-or-any-third-package-6io
  const newLinesMatch = /\r\n|\n|\r/;
  const newLine = "\n";
  const reIniKeyVal = /^\s*([\w.-]+)\s*=\s*(.*)?\s*$/;
  const reNewlines = /\\n/g;
  const obj: any = {};
  const contents = fileRead ? openFile(file) : file;
  contents
    .toString()
    .split(newLinesMatch)
    .forEach((line: any) => {
      // matching "KEY" and "VAL" in "KEY=VAL"
      const keyValueArr = line.match(reIniKeyVal);
      // matched?
      if (keyValueArr !== null) {
        const key = keyValueArr[1];
        // default undefined or missing values to empty string
        let val = keyValueArr[2] || "";
        const end = val.length - 1;
        // eslint-disable-next-line quotes
        const isDoubleQuoted = val[0] === '"' && val[end] === '"';
        const isSingleQuoted = val[0] === "'" && val[end] === "'";
        // if single or double quoted, remove quotes
        if (isSingleQuoted || isDoubleQuoted) {
          val = val.substring(1, end);
          // if double quoted, expand newlines
          if (isDoubleQuoted) {
            val = val.replace(reNewlines, newLine);
          }
        } else {
          //  remove surrounding whitespace
          val = val.trim();
        }
        obj[key] = val;
      }
    });
  return obj;
}

export function formatBytes(bytesInput: string, decimals = 2): string {
  const bytes = BigInt(bytesInput);
  if (bytes === BigInt(0)) return "0 Bytes";
  const k = BigInt(1024);
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];

  const logFn = (val: bigint, base: bigint): number => {
    let count = 0;
    while (val >= base) {
      val /= base;
      count++;
    }
    return count;
  };
  const i = Math.floor(logFn(bytes, k));
  const calculateValue = (bytes: bigint, k: bigint, i: number): number => {
    let value: bigint = bytes;
    for (let step = 0; step < i; step++) {
      value /= k;
    }
    return Number(value);
  };
  const result = calculateValue(bytes, k, i).toFixed(dm);
  return `${result} ${sizes[i]}`;
}
