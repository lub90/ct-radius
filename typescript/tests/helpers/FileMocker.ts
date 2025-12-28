import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export class FileMocker {
  private tempDir: string;

  constructor() {
    // Create a unique temp directory for each test run
    this.tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ct-radius-test-"));
  }

  /**
   * Creates a file inside the temp directory.
   * Returns the absolute path to the file.
   */
  createFile(filename: string, content: string): string {
    const filePath = path.join(this.tempDir, filename);
    fs.writeFileSync(filePath, content, "utf-8");
    return filePath;
  }

  createFileFromPath(filename: string, sourcePath: string): string {
    const content = fs.readFileSync(sourcePath, "utf-8");
    return this.createFile(filename, content);
  }

  /**
   * Creates a JSON file from an object.
   */
  createJsonFile(filename: string, data: unknown): string {
    return this.createFile(filename, JSON.stringify(data, null, 2));
  }

  /**
   * Deletes the entire temp directory.
   */
  cleanup(): void {
    fs.rmSync(this.tempDir, { recursive: true, force: true });
  }
}
