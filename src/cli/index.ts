import { fileURLToPath } from 'node:url'

import { hideBin } from 'yargs/helpers'
import yargs from 'yargs/yargs'

export async function run(argv: string[] = process.argv): Promise<void> {
  const commandsDir = fileURLToPath(new URL('./commands', import.meta.url))

  const cli = yargs(hideBin(argv))
    .scriptName('sonar-sweep')
    .env('SONAR')
    .commandDir(commandsDir, {
      extensions: ['js'],
      exclude: /\.test\.(ts|js)$/,
    })

  await cli
    .demandCommand(1, 'Provide a command')
    .strict()
    .help()
    .fail((message: string, error: Error | undefined, yargsInstance) => {
      if (error) {
        process.stderr.write(`${error.message}\n`)
        process.exit(1)
      }

      process.stderr.write(`${message}\n`)
      yargsInstance.showHelp()
      process.exit(1)
    })
    .parseAsync()
}
