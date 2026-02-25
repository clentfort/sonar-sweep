import type { Argv } from 'yargs'
import { getPullRequestHotspots } from '../../service/pr-hotspots.js'
import { resolveProjectKey } from '../project-key.js'

type PullRequestHotspotsArgs = {
  token: string
  baseUrl: string
  projectKey?: string
  pullRequest: string
  status: 'TO_REVIEW' | 'REVIEWED'
  page: number
  pageSize: number
  json: boolean
}

export const command = 'pr-hotspots <pullRequest> [projectKey]'
export const describe = 'Fetch security hotspots for a pull request'

export function builder(yargs: Argv): Argv<PullRequestHotspotsArgs> {
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
    .option('status', {
      alias: 's',
      type: 'string',
      default: 'TO_REVIEW' as const,
      choices: ['TO_REVIEW', 'REVIEWED'] as const,
      describe: 'Filter hotspots by status',
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

export async function handler(args: PullRequestHotspotsArgs): Promise<void> {
  const projectKey = resolveProjectKey(args.projectKey)
  const result = await getPullRequestHotspots(
    {
      token: args.token,
      baseUrl: args.baseUrl,
    },
    {
      projectKey,
      pullRequest: args.pullRequest,
      status: args.status,
      page: args.page,
      pageSize: args.pageSize,
    },
  )

  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
    return
  }

  const statusLabel = args.status === 'TO_REVIEW' ? 'unreviewed' : 'reviewed'
  process.stdout.write(
    `Found ${result.total} ${statusLabel} security hotspot(s) for PR ${result.pullRequest} (${result.projectKey})\n`,
  )

  if (result.hotspots.length === 0) {
    process.stdout.write(`\nSee analysis details: ${result.analysisUrl}\n`)
    return
  }

  process.stdout.write('\n')
  for (const hotspot of result.hotspots) {
    const location = hotspot.line ? `${hotspot.file}:${hotspot.line}` : hotspot.file
    const resolutionInfo = hotspot.resolution ? ` (${hotspot.resolution})` : ''
    process.stdout.write(
      `[${hotspot.vulnerabilityProbability}] ${hotspot.key}\n` +
        `  ${location}\n` +
        `  ${hotspot.message}${resolutionInfo}\n\n`,
    )
  }

  process.stdout.write(`See analysis details: ${result.analysisUrl}\n`)
}
