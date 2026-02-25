import {
  SonarCloudClient,
  type SonarCloudClientOptions,
  type SonarIssue,
  type SonarIssueComponent,
} from "./sonarcloud-client.js";

export type PullRequestIssue = {
  effort?: string;
  file: string;
  issueStatus: string;
  key: string;
  line?: number;
  message: string;
  rule: string;
  severity: string;
  status: string;
  type: string;
};

export type PullRequestIssuesReport = {
  analysisUrl: string;
  issues: Array<PullRequestIssue>;
  page: number;
  pageSize: number;
  projectKey: string;
  pullRequest: string;
  total: number;
};

export type PullRequestIssuesInput = {
  page?: number;
  pageSize?: number;
  projectKey: string;
  pullRequest: string;
};

export async function getPullRequestIssues(
  clientOptions: SonarCloudClientOptions,
  input: PullRequestIssuesInput,
): Promise<PullRequestIssuesReport> {
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
  const baseUrl = (clientOptions.baseUrl ?? "https://sonarcloud.io").replace(/\/$/, "");

  const client = new SonarCloudClient(clientOptions);
  const response = await client.getPullRequestIssues(projectKey, pullRequest, page, pageSize);
  const componentPathByKey = new Map(
    (response.components ?? []).map((component: SonarIssueComponent) => [
      component.key,
      component.path ?? component.longName ?? component.key,
    ]),
  );

  const issues = (response.issues ?? []).map((issue: SonarIssue): PullRequestIssue => {
    const file =
      componentPathByKey.get(issue.component) ??
      issue.component.split(":").slice(1).join(":") ??
      issue.component;

    return {
      effort: issue.effort,
      file,
      issueStatus: issue.issueStatus ?? issue.status,
      key: issue.key,
      line: issue.line,
      message: issue.message,
      rule: issue.rule,
      severity: issue.severity,
      status: issue.status,
      type: issue.type,
    };
  });

  return {
    analysisUrl: `${baseUrl}/dashboard?id=${encodeURIComponent(projectKey)}&pullRequest=${encodeURIComponent(pullRequest)}`,
    issues,
    page: response.paging?.pageIndex ?? page,
    pageSize: response.paging?.pageSize ?? pageSize,
    projectKey,
    pullRequest,
    total: response.total,
  };
}
