import {
  SonarCloudClient,
  type SonarCloudClientOptions,
  type SonarIssue,
  type SonarIssueComponent,
} from './sonarcloud-client.js'

export type PullRequestIssue = {
  key: string
  type: string
  severity: string
  status: string
  issueStatus: string
  rule: string
  message: string
  file: string
  line?: number
  effort?: string
}

export type PullRequestIssuesReport = {
  projectKey: string
  pullRequest: string
  total: number
  page: number
  pageSize: number
  analysisUrl: string
  issues: PullRequestIssue[]
}

export type PullRequestIssuesInput = {
  projectKey: string
  pullRequest: string
  page?: number
  pageSize?: number
}

export async function getPullRequestIssues(
  clientOptions: SonarCloudClientOptions,
  input: PullRequestIssuesInput,
): Promise<PullRequestIssuesReport> {
  const projectKey = input.projectKey.trim()
  const pullRequest = input.pullRequest.trim()
  if (!projectKey) {
    throw new Error('Missing projectKey')
  }
  if (!pullRequest) {
    throw new Error('Missing pullRequest')
  }

  const page = input.page ?? 1
  const pageSize = input.pageSize ?? 100
  const baseUrl = (clientOptions.baseUrl ?? 'https://sonarcloud.io').replace(/\/$/, '')

  const client = new SonarCloudClient(clientOptions)
  const response = await client.getPullRequestIssues(projectKey, pullRequest, page, pageSize)
  const componentPathByKey = new Map(
    (response.components ?? []).map((component: SonarIssueComponent) => [
      component.key,
      component.path ?? component.longName ?? component.key,
    ]),
  )

  const issues = (response.issues ?? []).map((issue: SonarIssue): PullRequestIssue => {
    const file =
      componentPathByKey.get(issue.component) ?? issue.component.split(':').slice(1).join(':') ?? issue.component

    return {
      key: issue.key,
      type: issue.type,
      severity: issue.severity,
      status: issue.status,
      issueStatus: issue.issueStatus ?? issue.status,
      rule: issue.rule,
      message: issue.message,
      file,
      line: issue.line,
      effort: issue.effort,
    }
  })

  return {
    projectKey,
    pullRequest,
    total: response.total,
    page: response.paging?.pageIndex ?? page,
    pageSize: response.paging?.pageSize ?? pageSize,
    analysisUrl: `${baseUrl}/dashboard?id=${encodeURIComponent(projectKey)}&pullRequest=${encodeURIComponent(pullRequest)}`,
    issues,
  }
}
