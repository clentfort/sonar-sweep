export async function runCli(argv: string[]): Promise<void> {
  const { run } = await import('../../../dist/cli/index.js')
  await run(['node', 'cli', ...argv])
}
