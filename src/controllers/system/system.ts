// Import necessary modules
import axios from "axios";
import crypto from "crypto";
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

/**
 * Checks if a given word is present in the provided text.
 *
 * @param text - The text to search within.
 * @param word - The word to search for.
 * @returns A boolean indicating whether the word is found in the text.
 */
export function containsWord(text: string, word: string): boolean {
  // return new RegExp(`\\b${word}\\b`, "i").test(text)
  return !!text.split(" ").find((el: string) => el === word);
}

/**
 * Replaces all occurrences of a whole word in a given text with a specified replacement string.
 *
 * @param word - The word to be replaced.
 * @param replaceWith - The string to replace the word with.
 * @param text - The text in which the word replacement will occur.
 * @returns The modified text with the word replaced.
 */
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

/**
 * Checks if the current process is running in a packaged environment.
 *
 * @returns {boolean} - Returns `true` if the process is running in a packaged environment, otherwise `false`.
 */
export function packaged(): boolean {
  return (process as any)?.pkg ? true : false;
}

/**
 * Returns the operating system platform of the Node.js process.
 *
 * @returns {NodeJS.Platform} The platform identifier.
 */
export function platform(): NodeJS.Platform {
  return process.platform;
}

/**
 * Removes any trailing slashes from the given URL.
 *
 * @param url - The URL string from which to remove trailing slashes.
 * @returns The URL string without trailing slashes.
 */
export function removeTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * Returns the current working directory path.
 * If the application is packaged, it returns the current working directory.
 * Otherwise, it returns the path relative to the source directory.
 *
 * @returns {string} The current working directory path without a trailing slash.
 */
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
    const strip = (options?.strip ?? false) ? "--strip-components=1" : "";
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
 * Generates a random string based on the specified length and character set.
 *
 * @param {number} [length=25] - The length of the random string to generate.
 * @param {Array<string>} [charset=["alphabetic", "numeric", "!#$%&*+-.@^_~"]] - The character set to use for generating the random string.
 * @returns {string} A randomly generated string.
 */
export function getRandomStr(
  length = 25,
  charset = ["alphabetic", "numeric", "!#$%&*+-.@^_~"]
): string {
  return randomstring.generate({ length, charset });
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
  const env = nunjucks.configure({ autoescape: false });
  env.addFilter("removeProtocol", (url: string) => {
    return url.replace(/^https?:\/\//, "");
  });
  return decode(env.render(path, values));
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

/**
 * Returns the architecture of the Node.js process.
 *
 * @returns {NodeJS.Architecture} The architecture of the Node.js process.
 */
export function arch(): NodeJS.Architecture {
  return process.arch;
}

/**
 * Returns the path of the current directory with the trailing slash removed.
 *
 * @returns {string} The path of the current directory without the trailing slash.
 */
export function packagedPwd(): string {
  return removeTrailingSlash(path.join(__dirname, "../"));
}

/**
 * Copies files or directories from the source path to the target path.
 *
 * @param source - The path of the source file or directory.
 * @param target - The path of the target file or directory.
 * @param options - Optional settings for the copy operation.
 * @param options.override - Whether to overwrite existing files. Defaults to true.
 * @param options.filter - A function to filter which files to copy.
 */
export function copyPaste(
  source: string,
  target: string,
  options?: { override?: boolean; filter?: fse.CopyFilterSync | undefined }
): void {
  fse.copySync(source, target, { overwrite: options?.override ?? true, filter: options?.filter });
}

/**
 * Downloads a file from the specified URL and saves it to the target path.
 *
 * @param url - The URL of the file to download.
 * @param targetPath - The local file path where the downloaded file will be saved.
 * @returns A promise that resolves when the file has been successfully downloaded and saved.
 */
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

/**
 * Deletes specified keys from a given dictionary.
 *
 * @param keys - An array of keys to be deleted from the dictionary.
 * @param dict - The dictionary from which keys will be deleted.
 * @returns A promise that resolves to void.
 */
export function deleteKeysFromDict(keys: string[], dict: any): Promise<void> {
  const dictCopy = Object.assign({}, dict);
  for (const key of dictCopy) {
    delete dictCopy[key];
  }
  return dictCopy;
}

/**
 * Retrieves the home directory of the current user.
 *
 * @returns {string} The path to the home directory.
 */
export function getHomeDirectory(): string {
  const homedir = os.homedir();
  return homedir;
}

/**
 * Reads an environment file and parses its contents into a dictionary object.
 *
 * @param file - The path to the environment file or the file content as a string.
 * @param fileRead - A boolean indicating whether to read the file from the filesystem or use the provided string content. Defaults to true.
 * @returns A dictionary object containing the parsed key-value pairs from the environment file.
 */
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

/**
 * Converts a string representing a number of bytes into a human-readable format.
 *
 * @param bytesInput - The input string representing the number of bytes.
 * @param inputType - The unit of the input bytes (optional). Can be "Bytes", "KiB", "MiB", or "GiB".
 * @param decimals - The number of decimal places to include in the formatted output (default is 2).
 * @returns A string representing the formatted bytes in a human-readable format.
 */
export function formatBytes(
  bytesInput: string,
  inputType?: "Bytes" | "KiB" | "MiB" | "GiB",
  decimals = 2
): string {
  const bytes = BigInt(bytesInput?.replace(/\D/g, ""));
  if (bytes === BigInt(0)) return "0 Bytes";
  const k = BigInt(1024);
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KiB", "MiB", "GiB"].filter((size: string) => size !== inputType);
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

/**
 * Removes consecutive spaces from a string, replacing them with a single space.
 * Also trims leading and trailing spaces from the string.
 *
 * @param str - The input string from which to remove duplicate spaces.
 * @returns The processed string with no consecutive spaces.
 */
export function removeDuplicateSpaces(str: string) {
  // Replace consecutive spaces with a single space
  return str.replace(/ {2,}/g, " ").trim();
}

/**
 * Adds a new string after the nth word in the original string.
 *
 * @param originalStr - The original string where the new string will be added.
 * @param newStr - The new string to be added after the nth word.
 * @param position - The position after which the new string will be added. Must be a non-negative integer.
 * @returns The modified string with the new string added after the nth word.
 * @throws Will throw an error if the position is a negative integer.
 */
export function addStringAfterNthWord(originalStr: string, newStr: string, position: number) {
  // Split the string into words using space as a delimiter
  const words = originalStr.split(" ");
  // Validate the position to ensure it's within bounds
  if (position < 0) {
    throw new Error("Position must be a non-negative integer.");
  }
  // Insert the new string after the specified position
  if (words.length > position) {
    words.splice(position + 1, 0, newStr);
  } else {
    // If position is greater than the number of words, append the new string at the end
    words.push(newStr);
  }
  // Join the words back into a single string
  return words.join(" ");
}

/**
 * Generates a hash for the given input string using the specified algorithm.
 *
 * @param input - The input string to hash.
 * @param algorithm - The hash algorithm to use (default is "sha256").
 * @returns The resulting hash as a hexadecimal string.
 */
export function getHash(input: string, algorithm = "sha256"): string {
  return crypto.createHash(algorithm).update(input).digest("hex");
}

/**
 * Base64 encode a string
 * @param input - The string to encode
 * @returns The Base64 encoded string
 */
export function base64Encode(input: string): string {
  return Buffer.from(input).toString("base64");
}

/**
 * Base64 decode a string
 * @param input - The Base64 encoded string to decode
 * @returns The decoded string
 */
export function base64Decode(input: string): string {
  return Buffer.from(input, "base64").toString("utf-8");
}
