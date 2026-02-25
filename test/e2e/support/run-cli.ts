export async function runCli(argv: Array<string>): Promise<void> {
  const { run } = await import("../../../dist/cli/index.mjs");
  await run(["node", "cli", ...argv]);
}
