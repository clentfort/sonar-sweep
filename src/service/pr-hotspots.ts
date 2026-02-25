import {
  SonarCloudClient,
  type SonarCloudClientOptions,
  type SonarHotspot,
} from './sonarcloud-client.js'

export type PullRequestHotspot = {
  key: string
  message: string
  file: string
  line?: number
  securityCategory: string
  vulnerabilityProbability: string
  status: string
  resolution?: string
}

export type PullRequestHotspotsResult = {
  projectKey: string
  pullRequest: string
  total: number
  page: number
  pageSize: number
  analysisUrl: string
  hotspots: PullRequestHotspot[]
}

export type PullRequestHotspotsInput = {
  projectKey: string
  pullRequest: string
  status?: 'TO_REVIEW' | 'REVIEWED'
  page?: number
  pageSize?: number
}

export async function getPullRequestHotspots(
  clientOptions: SonarCloudClientOptions,
  input: PullRequestHotspotsInput,
): Promise<PullRequestHotspotsResult> {
  const projectKey = input.projectKey.trim()
  const pullRequest = input.pullRequest.trim()
  const status = input.status ?? 'TO_REVIEW'
  const page = input.page ?? 1
  const pageSize = input.pageSize ?? 100

  if (!projectKey) {
    throw new Error('Missing projectKey')
  }

  if (!pullRequest) {
    throw new Error('Missing pullRequest')
  }

  const baseUrl = (clientOptions.baseUrl ?? 'https://sonarcloud.io').replace(/\/$/, '')
  const client = new SonarCloudClient(clientOptions)

  const response = await client.getHotspots(projectKey, pullRequest, status, page, pageSize)

  const componentMap = new Map<string, string>()
  for (const component of response.components ?? []) {
    componentMap.set(component.key, component.path ?? component.longName ?? component.key)
  }

  const hotspots: PullRequestHotspot[] = response.hotspots.map((hotspot: SonarHotspot) => ({
    key: hotspot.key,
    message: hotspot.message,
    file: extractFilePath(hotspot.component, projectKey, componentMap),
    line: hotspot.line,
    securityCategory: hotspot.securityCategory,
    vulnerabilityProbability: hotspot.vulnerabilityProbability,
    status: hotspot.status,
    resolution: hotspot.resolution,
  }))

  return {
    projectKey,
    pullRequest,
    total: response.paging.total,
    page: response.paging.pageIndex,
    pageSize: response.paging.pageSize,
    analysisUrl: `${baseUrl}/project/security_hotspots?id=${encodeURIComponent(projectKey)}&pullRequest=${encodeURIComponent(pullRequest)}`,
    hotspots,
  }
}

function extractFilePath(
  componentKey: string,
  projectKey: string,
  componentMap: Map<string, string>,
): string {
  // First check the component map
  const mappedPath = componentMap.get(componentKey)
  if (mappedPath) {
    return mappedPath
  }

  // Fallback: extract path from component key (format: projectKey:path/to/file)
  const prefix = `${projectKey}:`
  if (componentKey.startsWith(prefix)) {
    return componentKey.slice(prefix.length)
  }

  return componentKey
}
