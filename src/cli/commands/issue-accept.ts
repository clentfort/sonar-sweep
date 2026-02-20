import type { Argv } from 'yargs'

import { transitionIssue } from '../../service/issue-transition.js'

type IssueAcceptArgs = {
  token: string
  baseUrl: string
  issueKey: string
  comment?: string
  json: boolean
}

export const command = 'issue-accept <issueKey>'
export const describe = 'Mark a Sonar issue as accepted (transition=accept)'

export function builder(yargs: Argv): Argv<IssueAcceptArgs> {
  return yargs
    .positional('issueKey', {
      type: 'string',
      demandOption: 'Provide an issue key',
      coerce: (value: unknown) => String(value).trim(),
    })
    .option('token', {
      type: 'string',
      default: process.env.SONAR_TOKEN,
      defaultDescription: 'SONAR_TOKEN',
      demandOption: 'Provide --token or set SONAR_TOKEN',
    })
    .option('baseUrl', {
      alias: ['base-url', 'url'],
      type: 'string',
      default: process.env.SONAR_BASE_URL ?? 'https://sonarcloud.io',
      defaultDescription: 'SONAR_BASE_URL or https://sonarcloud.io',
      coerce: (value: unknown) => String(value).replace(/\/$/, ''),
    })
    .option('comment', {
      type: 'string',
      describe: 'Optional acceptance comment',
    })
    .option('json', {
      type: 'boolean',
      default: false,
      describe: 'Print raw JSON for automation/agents',
    })
}

export async function handler(args: IssueAcceptArgs): Promise<void> {
  const result = await transitionIssue(
    {
      token: args.token,
      baseUrl: args.baseUrl,
    },
    {
      issueKey: args.issueKey,
      transition: 'accept',
      comment: args.comment,
    },
  )

  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
    return
  }

  process.stdout.write(`Accepted issue ${result.issueKey} (${result.transition})\n`)
}
