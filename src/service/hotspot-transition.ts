import {
  type HotspotResolution,
  SonarCloudClient,
  type SonarCloudClientOptions,
} from './sonarcloud-client.js'

export type HotspotTransitionInput = {
  hotspotKey: string
  resolution: HotspotResolution
  comment?: string
}

export type HotspotTransitionResult = {
  hotspotKey: string
  status: 'REVIEWED'
  resolution: HotspotResolution
  applied: true
}

export async function reviewHotspot(
  clientOptions: SonarCloudClientOptions,
  input: HotspotTransitionInput,
): Promise<HotspotTransitionResult> {
  const hotspotKey = input.hotspotKey.trim()
  const resolution = input.resolution
  const comment = input.comment?.trim()

  if (!hotspotKey) {
    throw new Error('Missing hotspotKey')
  }

  if (!resolution) {
    throw new Error('Missing resolution (SAFE, ACKNOWLEDGED, or FIXED)')
  }

  const validResolutions: HotspotResolution[] = ['SAFE', 'ACKNOWLEDGED', 'FIXED']
  if (!validResolutions.includes(resolution)) {
    throw new Error(
      `Invalid resolution: ${resolution}. Must be one of: ${validResolutions.join(', ')}`,
    )
  }

  const client = new SonarCloudClient(clientOptions)
  await client.changeHotspotStatus(hotspotKey, 'REVIEWED', resolution, comment)

  return {
    hotspotKey,
    status: 'REVIEWED',
    resolution,
    applied: true,
  }
}
