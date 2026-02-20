import type { Argv } from 'yargs'

import { resolveProjectKey } from '../project-key.js'
import { getPullRequestReview } from '../../service/pr-review.js'

type PullRequestReviewArgs = {
  token: string
  baseUrl: string
  projectKey?: string
  pullRequest: string
  contextLines: number
  page: number
  pageSize: number
  json: boolean
}

export const command = 'pr-review <pullRequest> [projectKey]'
export const describe = 'Review Sonar pull request issues with code context snippets'

export function builder(yargs: Argv): Argv<PullRequestReviewArgs> {
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
    .option('contextLines', {
      alias: ['context', 'C'],
      type: 'number',
      default: 3,
      coerce: (value: unknown) => Math.max(0, Number(value)),
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
      default: 20,
      coerce: (value: unknown) => Math.min(500, Math.max(1, Number(value))),
    })
    .option('json', {
      type: 'boolean',
      default: false,
      describe: 'Print raw JSON for automation/agents',
    })
}

export async function handler(args: PullRequestReviewArgs): Promise<void> {
  const projectKey = resolveProjectKey(args.projectKey)
  const report = await getPullRequestReview(
    {
      token: args.token,
      baseUrl: args.baseUrl,
    },
    {
      projectKey,
      pullRequest: args.pullRequest,
      contextLines: args.contextLines,
      page: args.page,
      pageSize: args.pageSize,
    },
  )

  if (args.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
    return
  }

  process.stdout.write(
    `Found ${report.total} open issue(s) in new code for PR ${report.pullRequest} (${report.projectKey})\n\n`,
  )

  for (const issue of report.issues) {
    const location = issue.line ? `${issue.file}:${issue.line}` : issue.file
    process.stdout.write(
      `[${issue.issueStatus}] ${issue.severity} ${issue.type} ${issue.rule} ${location}\n${issue.message}\n`,
    )
    process.stdout.write(`Issue URL: ${issue.issueUrl}\n`)

    if (issue.snippet) {
      process.stdout.write('Context:\n')
      for (const line of issue.snippet.lines) {
        const marker = line.highlight ? '>' : ' '
        process.stdout.write(`${marker} ${line.line.toString().padStart(4, ' ')} | ${line.text}\n`)
      }
    } else if (issue.sourceError) {
      process.stdout.write(`Context unavailable: ${issue.sourceError}\n`)
    }

    process.stdout.write('\n')
  }

  process.stdout.write(`See analysis details: ${report.analysisUrl}\n`)
}
