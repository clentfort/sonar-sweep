import type { Argv } from 'yargs'

import { reviewHotspot } from '../../service/hotspot-transition.js'
import type { HotspotResolution } from '../../service/sonarcloud-client.js'

type HotspotReviewArgs = {
  token: string
  baseUrl: string
  hotspotKey: string
  resolution: HotspotResolution
  comment?: string
  json: boolean
}

export const command = 'hotspot-review <hotspotKey>'
export const describe = 'Mark a security hotspot as reviewed (SAFE, ACKNOWLEDGED, or FIXED)'

export function builder(yargs: Argv): Argv<HotspotReviewArgs> {
  return yargs
    .positional('hotspotKey', {
      type: 'string',
      demandOption: 'Provide a hotspot key',
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
    .option('resolution', {
      alias: 'r',
      type: 'string',
      choices: ['SAFE', 'ACKNOWLEDGED', 'FIXED'] as const,
      default: 'SAFE' as const,
      describe:
        'Resolution type: SAFE (not a risk), ACKNOWLEDGED (risk accepted), FIXED (code changed)',
    })
    .option('comment', {
      alias: 'c',
      type: 'string',
      describe: 'Optional review comment',
    })
    .option('json', {
      type: 'boolean',
      default: false,
      describe: 'Print raw JSON for automation/agents',
    })
}

export async function handler(args: HotspotReviewArgs): Promise<void> {
  const result = await reviewHotspot(
    {
      token: args.token,
      baseUrl: args.baseUrl,
    },
    {
      hotspotKey: args.hotspotKey,
      resolution: args.resolution,
      comment: args.comment,
    },
  )

  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
    return
  }

  process.stdout.write(`Reviewed hotspot ${result.hotspotKey} as ${result.resolution}\n`)
}
