import { afterEach, beforeEach, vi } from 'vitest'

export function setupCliProcess(): {
  stdoutSpy: () => ReturnType<typeof vi.spyOn>
  stderrSpy: () => ReturnType<typeof vi.spyOn>
} {
  let stdout: ReturnType<typeof vi.spyOn>
  let stderr: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
  })

  afterEach(() => {
    stdout.mockRestore()
    stderr.mockRestore()
  })

  return {
    stdoutSpy: () => stdout,
    stderrSpy: () => stderr,
  }
}
