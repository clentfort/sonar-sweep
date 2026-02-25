import { SonarCloudClient, type SonarCloudClientOptions } from "./sonarcloud-client.js";

export type PullRequestIssueReview = {
  effort?: string;
  file: string;
  issueStatus: string;
  issueUrl: string;
  key: string;
  line?: number;
  message: string;
  rule: string;
  severity: string;
  snippet?: {
    endLine: number;
    lines: Array<{
      highlight: boolean;
      line: number;
      text: string;
    }>;
    startLine: number;
  };
  sourceError?: string;
  status: string;
  type: string;
};

export type PullRequestReviewReport = {
  analysisUrl: string;
  issues: Array<PullRequestIssueReview>;
  projectKey: string;
  pullRequest: string;
  total: number;
};

export type PullRequestReviewInput = {
  contextLines?: number;
  page?: number;
  pageSize?: number;
  projectKey: string;
  pullRequest: string;
};

export async function getPullRequestReview(
  clientOptions: SonarCloudClientOptions,
  input: PullRequestReviewInput,
): Promise<PullRequestReviewReport> {
  const projectKey = input.projectKey.trim();
  const pullRequest = input.pullRequest.trim();
  if (!projectKey) {
    throw new Error("Missing projectKey");
  }
  if (!pullRequest) {
    throw new Error("Missing pullRequest");
  }

  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 100;
  const contextLines = Math.max(0, input.contextLines ?? 3);
  const baseUrl = (clientOptions.baseUrl ?? "https://sonarcloud.io").replace(/\/$/, "");

  const client = new SonarCloudClient(clientOptions);
  const response = await client.getPullRequestIssues(projectKey, pullRequest, page, pageSize);

  const componentPathByKey = new Map(
    (response.components ?? []).map((component) => [
      component.key,
      component.path ?? component.longName ?? component.key,
    ]),
  );

  const issues = await Promise.all(
    (response.issues ?? []).map(async (issue) => {
      const file =
        componentPathByKey.get(issue.component) ??
        issue.component.split(":").slice(1).join(":") ??
        issue.component;
      const result: PullRequestIssueReview = {
        effort: issue.effort,
        file,
        issueStatus: issue.issueStatus ?? issue.status,
        issueUrl: buildIssueUrl(baseUrl, projectKey, pullRequest, issue.key),
        key: issue.key,
        line: issue.line,
        message: issue.message,
        rule: issue.rule,
        severity: issue.severity,
        status: issue.status,
        type: issue.type,
      };

      if (!issue.line) {
        return result;
      }

      try {
        const source = await client.getSourceRaw(issue.component, pullRequest);
        result.snippet = makeSnippet(source, issue.line, contextLines);
      } catch (error) {
        result.sourceError = error instanceof Error ? error.message : String(error);
      }

      return result;
    }),
  );

  return {
    analysisUrl: `${baseUrl}/dashboard?id=${encodeURIComponent(projectKey)}&pullRequest=${encodeURIComponent(pullRequest)}`,
    issues,
    projectKey,
    pullRequest,
    total: response.total,
  };
}

function buildIssueUrl(
  baseUrl: string,
  projectKey: string,
  pullRequest: string,
  issueKey: string,
): string {
  const url = new URL("/project/issues", baseUrl);
  url.searchParams.set("id", projectKey);
  url.searchParams.set("pullRequest", pullRequest);
  url.searchParams.set("issues", issueKey);
  url.searchParams.set("open", issueKey);
  return String(url);
}

function makeSnippet(source: string, issueLine: number, contextLines: number) {
  const lines = source.split(/\r?\n/);
  const startLine = Math.max(1, issueLine - contextLines);
  const endLine = Math.min(lines.length, issueLine + contextLines);

  return {
    endLine,
    lines: lines.slice(startLine - 1, endLine).map((text, index) => {
      const line = startLine + index;
      return {
        highlight: line === issueLine,
        line,
        text,
      };
    }),
    startLine,
  };
}
