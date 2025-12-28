import { vi, expect } from 'vitest';

export class ConsoleChecker {
  private spies: ReturnType<typeof vi.spyOn>[] = [];

  setup() {
    this.spies = [
      vi.spyOn(console, 'log').mockImplementation(() => {}),
      vi.spyOn(console, 'warn').mockImplementation(() => {}),
      vi.spyOn(console, 'error').mockImplementation(() => {}),
    ];
  }

  teardown() {
    this.spies.forEach(spy => spy.mockRestore());
  }

  checkNoOutput() {
    expect(console.log).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  }
}