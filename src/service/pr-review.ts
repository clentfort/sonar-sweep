import { SonarCloudClient, type SonarCloudClientOptions } from './sonarcloud-client.js'

export type PullRequestIssueReview = {
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
  issueUrl: string
  snippet?: {
    startLine: number
    endLine: number
    lines: Array<{
      line: number
      text: string
      highlight: boolean
    }>
  }
  sourceError?: string
}

export type PullRequestReviewReport = {
  projectKey: string
  pullRequest: string
  total: number
  analysisUrl: string
  issues: PullRequestIssueReview[]
}

export type PullRequestReviewInput = {
  projectKey: string
  pullRequest: string
  contextLines?: number
  page?: number
  pageSize?: number
}

export async function getPullRequestReview(
  clientOptions: SonarCloudClientOptions,
  input: PullRequestReviewInput,
): Promise<PullRequestReviewReport> {
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
  const contextLines = Math.max(0, input.contextLines ?? 3)
  const baseUrl = (clientOptions.baseUrl ?? 'https://sonarcloud.io').replace(/\/$/, '')

  const client = new SonarCloudClient(clientOptions)
  const response = await client.getPullRequestIssues(projectKey, pullRequest, page, pageSize)

  const componentPathByKey = new Map(
    (response.components ?? []).map((component) => [
      component.key,
      component.path ?? component.longName ?? component.key,
    ]),
  )

  const issues = await Promise.all(
    (response.issues ?? []).map(async (issue) => {
      const file =
        componentPathByKey.get(issue.component) ?? issue.component.split(':').slice(1).join(':') ?? issue.component
      const result: PullRequestIssueReview = {
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
        issueUrl: buildIssueUrl(baseUrl, projectKey, pullRequest, issue.key),
      }

      if (!issue.line) {
        return result
      }

      try {
        const source = await client.getSourceRaw(issue.component, pullRequest)
        result.snippet = makeSnippet(source, issue.line, contextLines)
      } catch (error) {
        result.sourceError = error instanceof Error ? error.message : String(error)
      }

      return result
    }),
  )

  return {
    projectKey,
    pullRequest,
    total: response.total,
    analysisUrl: `${baseUrl}/dashboard?id=${encodeURIComponent(projectKey)}&pullRequest=${encodeURIComponent(pullRequest)}`,
    issues,
  }
}

function buildIssueUrl(baseUrl: string, projectKey: string, pullRequest: string, issueKey: string): string {
  const url = new URL('/project/issues', baseUrl)
  url.searchParams.set('id', projectKey)
  url.searchParams.set('pullRequest', pullRequest)
  url.searchParams.set('issues', issueKey)
  url.searchParams.set('open', issueKey)
  return String(url)
}

function makeSnippet(source: string, issueLine: number, contextLines: number) {
  const lines = source.split(/\r?\n/)
  const startLine = Math.max(1, issueLine - contextLines)
  const endLine = Math.min(lines.length, issueLine + contextLines)

  return {
    startLine,
    endLine,
    lines: lines.slice(startLine - 1, endLine).map((text, index) => {
      const line = startLine + index
      return {
        line,
        text,
        highlight: line === issueLine,
      }
    }),
  }
}
