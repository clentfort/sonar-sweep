import type { Argv } from 'yargs'

import { resolveProjectKey } from '../project-key.js'
import { getPullRequestIssues } from '../../service/pr-issues.js'

type PullRequestIssuesArgs = {
  token: string
  baseUrl: string
  projectKey?: string
  pullRequest: string
  page: number
  pageSize: number
  json: boolean
}

export const command = 'pr-issues <pullRequest> [projectKey]'
export const describe = 'Fetch SonarQube Cloud issue details for a pull request'

export function builder(yargs: Argv): Argv<PullRequestIssuesArgs> {
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
    .option('page', {
      alias: 'p',
      type: 'number',
      default: 1,
      coerce: (value: unknown) => Math.max(1, Number(value)),
    })
    .option('pageSize', {
      alias: ['ps', 'page-size'],
      type: 'number',
      default: 100,
      coerce: (value: unknown) => Math.min(500, Math.max(1, Number(value))),
    })
    .option('json', {
      type: 'boolean',
      default: false,
      describe: 'Print raw JSON for automation/agents',
    })
}

export async function handler(args: PullRequestIssuesArgs): Promise<void> {
  const projectKey = resolveProjectKey(args.projectKey)
  const report = await getPullRequestIssues(
    {
      token: args.token,
      baseUrl: args.baseUrl,
    },
    {
      projectKey,
      pullRequest: args.pullRequest,
      page: args.page,
      pageSize: args.pageSize,
    },
  )

  if (args.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
    return
  }

  process.stdout.write(
    `Found ${report.total} open issue(s) in new code for PR ${report.pullRequest} (${report.projectKey})\n`,
  )

  if (report.issues.length === 0) {
    process.stdout.write(`See analysis details: ${report.analysisUrl}\n`)
    return
  }

  for (const issue of report.issues) {
    const location = issue.line ? `${issue.file}:${issue.line}` : issue.file
    process.stdout.write(
      `- [${issue.issueStatus}] ${issue.severity} ${issue.type} ${issue.rule} ${location} - ${issue.message}\n`,
    )
  }

  process.stdout.write(`See analysis details: ${report.analysisUrl}\n`)
}
