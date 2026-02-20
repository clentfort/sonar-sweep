import type { Argv } from 'yargs'

import { resolveProjectKey } from '../project-key.js'
import { getPullRequestCoverage } from '../../service/pr-coverage.js'

type PullRequestCoverageArgs = {
  token: string
  baseUrl: string
  projectKey?: string
  pullRequest: string
  threshold: number
  includePassing: boolean
  maxFiles: number
  json: boolean
}

export const command = 'pr-coverage <pullRequest> [projectKey]'
export const describe = 'List files with low new-code coverage for a pull request'

export function builder(yargs: Argv): Argv<PullRequestCoverageArgs> {
  return yargs
    .positional('projectKey', {
      type: 'string',
      describe: 'Sonar project key (optional; auto-detected from sonar-project.properties)',
    })
    .positional('pullRequest', {
      type: 'string',
      demandOption: 'Provide a pull request key/id',
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
    .option('projectKey', {
      alias: ['project-key', 'k'],
      type: 'string',
      describe: 'Sonar project key (overrides auto-detection)',
    })
    .option('threshold', {
      type: 'number',
      default: 80,
      describe: 'Coverage threshold percentage',
      coerce: (value: unknown) => Math.max(0, Math.min(100, Number(value))),
    })
    .option('includePassing', {
      type: 'boolean',
      default: false,
      describe: 'Include files that meet threshold too',
    })
    .option('maxFiles', {
      alias: ['max', 'limit'],
      type: 'number',
      default: 20,
      coerce: (value: unknown) => Math.max(1, Number(value)),
    })
    .option('json', {
      type: 'boolean',
      default: false,
      describe: 'Print raw JSON for automation/agents',
    })
}

export async function handler(args: PullRequestCoverageArgs): Promise<void> {
  const projectKey = resolveProjectKey(args.projectKey)
  const report = await getPullRequestCoverage(
    {
      token: args.token,
      baseUrl: args.baseUrl,
    },
    {
      projectKey,
      pullRequest: args.pullRequest,
      threshold: args.threshold,
      includePassing: args.includePassing,
      maxFiles: args.maxFiles,
    },
  )

  if (args.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
    return
  }

  process.stdout.write(
    `Found ${report.files.length} file(s) below ${report.threshold.toFixed(1)}% new-code coverage\n`,
  )
  for (const file of report.files) {
    process.stdout.write(
      `- ${file.file}: ${file.coverageOnNewCode.toFixed(1)}% (${file.uncoveredLines}/${file.linesToCover} uncovered lines)\n`,
    )
  }
  process.stdout.write(`See analysis details: ${report.analysisUrl}\n`)
}
