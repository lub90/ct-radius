import fs from "node:fs";
import path from "node:path";
import { FileMocker } from "./FileMocker";

export class FixtureLoader {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve("./tests/fixtures");
  }

  // -----------------------------
  // Generic loader
  // -----------------------------
  private loadFilesFrom(dir: string, extension: string): string[] {
    const fullDir = path.join(this.baseDir, dir);

    if (!fs.existsSync(fullDir)) {
      return [];
    }

    return fs
      .readdirSync(fullDir)
      .filter(f => f.endsWith(extension))
      .map(f => path.join(fullDir, f));
  }

  // -----------------------------
  // ENV fixtures
  // -----------------------------
  getValidEnvs(): FileMocker[] {
    return this.loadEnvFixtures("valid_envs");
  }

  getInvalidEnvs(): FileMocker[] {
    return this.loadEnvFixtures("invalid_envs");
  }

  private loadEnvFixtures(subdir: string): FileMocker[] {
    const files = this.loadFilesFrom(subdir, ".env");

    return files.map(envPath => {
      const mocker = new FileMocker();
      const content = fs.readFileSync(envPath, "utf-8");
      mocker.createFile("var.env", content);
      return mocker;
    });
  }

  // -----------------------------
  // JSON config fixtures
  // -----------------------------
  getValidConfigs(): string[] {
    return this.loadFilesFrom("valid_configs", ".json");
  }

  getInvalidConfigs(): string[] {
    return this.loadFilesFrom("invalid_configs", ".json");
  }

}
