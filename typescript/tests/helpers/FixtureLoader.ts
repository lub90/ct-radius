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

  getValidEnvs(): string[] {
    return this.loadFilesFrom("valid_envs", ".env");
  }

  getInvalidEnvs(): string[] {
    return this.loadFilesFrom("invalid_envs", ".env");
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
