import { SonarCloudClient, type SonarCloudClientOptions } from './sonarcloud-client.js'

export type PullRequestCoverageFile = {
  file: string
  coverageOnNewCode: number
  linesToCover: number
  uncoveredLines: number
}

export type PullRequestCoverageReport = {
  projectKey: string
  pullRequest: string
  threshold: number
  analysisUrl: string
  files: PullRequestCoverageFile[]
}

export type PullRequestCoverageInput = {
  projectKey: string
  pullRequest: string
  threshold?: number
  includePassing?: boolean
  maxFiles?: number
}

export async function getPullRequestCoverage(
  clientOptions: SonarCloudClientOptions,
  input: PullRequestCoverageInput,
): Promise<PullRequestCoverageReport> {
  const projectKey = input.projectKey.trim()
  const pullRequest = input.pullRequest.trim()
  if (!projectKey) {
    throw new Error('Missing projectKey')
  }
  if (!pullRequest) {
    throw new Error('Missing pullRequest')
  }

  const threshold = input.threshold ?? 80
  const includePassing = input.includePassing ?? false
  const maxFiles = Math.max(1, input.maxFiles ?? 20)
  const baseUrl = (clientOptions.baseUrl ?? 'https://sonarcloud.io').replace(/\/$/, '')

  const client = new SonarCloudClient(clientOptions)
  const tree = await client.getCoverageComponentTree(projectKey, pullRequest, 1, 500)

  const files = tree.components
    .map((component) => {
      const file = component.path ?? component.name
      const coverageOnNewCode = value(component.measures, 'new_coverage')
      const linesToCover = value(component.measures, 'new_lines_to_cover')
      const uncoveredLines = value(component.measures, 'new_uncovered_lines')
      return {
        file,
        coverageOnNewCode,
        linesToCover,
        uncoveredLines,
      }
    })
    .filter((item) => item.linesToCover > 0)
    .filter((item) => includePassing || item.coverageOnNewCode < threshold)
    .sort((a, b) => a.coverageOnNewCode - b.coverageOnNewCode)
    .slice(0, maxFiles)

  return {
    projectKey,
    pullRequest,
    threshold,
    analysisUrl: `${baseUrl}/dashboard?id=${encodeURIComponent(projectKey)}&pullRequest=${encodeURIComponent(pullRequest)}`,
    files,
  }
}

function value(
  measures: Array<{ metric: string; value?: string; periods?: Array<{ value: string }> }>,
  metric: string,
): number {
  const measure = measures.find((item) => item.metric === metric)
  const raw = measure?.periods?.[0]?.value ?? measure?.value ?? '0'
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) ? parsed : 0
}
