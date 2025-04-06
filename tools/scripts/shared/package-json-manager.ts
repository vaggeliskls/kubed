import { readFileSync } from "node:fs";
import { join } from "node:path";

class PackageJsonManager {
  private readonly packageJsonPath = join(process.cwd(), "package.json");

  private get packageJson(): any {
    return JSON.parse(readFileSync(this.packageJsonPath).toString());
  }

  getVersion(): string {
    return this.packageJson.version as string;
  }

  getNodeMajorVersion(): number {
    return parseInt(process.version.slice(1).split(".")[0]);
  }
}

export const packageJson = new PackageJsonManager();
