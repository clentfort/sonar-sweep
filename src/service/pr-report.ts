import {
  type IssuesFacetValue,
  SonarCloudClient,
  type SonarCloudClientOptions,
} from './sonarcloud-client.js'

export type PullRequestReport = {
  projectKey: string
  pullRequest: string
  qualityGateStatus: string
  failingQualityGateConditions: Array<{
    metricKey: string
    comparator: string
    errorThreshold?: string
    actualValue?: string
  }>
  analysisUrl: string
  issueCounts: {
    newIssues: number
    acceptedIssues: number
  }
  measures: {
    securityHotspots: number
    coverageOnNewCode: number
    duplicationOnNewCode: number
  }
}

export type PullRequestReportInput = {
  projectKey: string
  pullRequest: string
}

export async function getPullRequestReport(
  clientOptions: SonarCloudClientOptions,
  input: PullRequestReportInput,
): Promise<PullRequestReport> {
  const projectKey = input.projectKey.trim()
  const pullRequest = input.pullRequest.trim()

  if (!projectKey) {
    throw new Error('Missing projectKey')
  }

  if (!pullRequest) {
    throw new Error('Missing pullRequest')
  }

  const baseUrl = (clientOptions.baseUrl ?? 'https://sonarcloud.io').replace(/\/$/, '')
  const client = new SonarCloudClient(clientOptions)

  const [projectStatusResponse, issuesResponse, measuresResponse] = await Promise.all([
    client.getProjectStatus(projectKey, pullRequest),
    client.getIssuesFacets(projectKey, pullRequest),
    client.getMeasures(projectKey, pullRequest),
  ])

  const issueStatuses = issuesResponse.facets.find((facet) => facet.property === 'issueStatuses')
  const newIssues = sumCounts(issueStatuses?.values, ['OPEN', 'CONFIRMED', 'REOPENED'])
  const acceptedIssues = sumCounts(issueStatuses?.values, ['ACCEPTED'])

  return {
    projectKey,
    pullRequest,
    qualityGateStatus: projectStatusResponse.projectStatus.status,
    failingQualityGateConditions: projectStatusResponse.projectStatus.conditions
      .filter((condition) => condition.status !== 'OK')
      .map((condition) => ({
        metricKey: condition.metricKey,
        comparator: condition.comparator,
        errorThreshold: condition.errorThreshold,
        actualValue: condition.actualValue,
      })),
    analysisUrl: `${baseUrl}/dashboard?id=${encodeURIComponent(projectKey)}&pullRequest=${encodeURIComponent(pullRequest)}`,
    issueCounts: {
      newIssues,
      acceptedIssues,
    },
    measures: {
      securityHotspots: measureValue(measuresResponse.component.measures, 'new_security_hotspots'),
      coverageOnNewCode: measureValue(measuresResponse.component.measures, 'new_coverage'),
      duplicationOnNewCode: measureValue(
        measuresResponse.component.measures,
        'new_duplicated_lines_density',
      ),
    },
  }
}

function sumCounts(values: IssuesFacetValue[] | undefined, keys: string[]): number {
  if (!values) {
    return 0
  }

  return values
    .filter((item) => keys.includes(item.val))
    .reduce((total, item) => total + item.count, 0)
}

function measureValue(
  measures: Array<{ metric: string; value?: string; periods?: Array<{ value: string }> }>,
  metric: string,
): number {
  const measure = measures.find((item) => item.metric === metric)
  const rawValue = measure?.periods?.[0]?.value ?? measure?.value ?? '0'
  const parsed = Number.parseFloat(rawValue)
  return Number.isFinite(parsed) ? parsed : 0
}
