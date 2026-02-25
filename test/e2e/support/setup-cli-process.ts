import { afterEach, beforeEach, vi } from "vitest";

export function setupCliProcess(): {
  stderrSpy: () => ReturnType<typeof vi.spyOn>;
  stdoutSpy: () => ReturnType<typeof vi.spyOn>;
} {
  let stdout: ReturnType<typeof vi.spyOn>;
  let stderr: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    stdout.mockRestore();
    stderr.mockRestore();
  });

  return {
    stderrSpy: () => stderr,
    stdoutSpy: () => stdout,
  };
}
