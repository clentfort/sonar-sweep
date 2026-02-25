import {
  type IssuesFacetValue,
  SonarCloudClient,
  type SonarCloudClientOptions,
} from "./sonarcloud-client.js";

export type PullRequestReport = {
  analysisUrl: string;
  failingQualityGateConditions: Array<{
    actualValue?: string;
    comparator: string;
    errorThreshold?: string;
    metricKey: string;
  }>;
  issueCounts: {
    acceptedIssues: number;
    newIssues: number;
  };
  measures: {
    coverageOnNewCode: number;
    duplicationOnNewCode: number;
    securityHotspots: number;
  };
  projectKey: string;
  pullRequest: string;
  qualityGateStatus: string;
};

export type PullRequestReportInput = {
  projectKey: string;
  pullRequest: string;
};

export async function getPullRequestReport(
  clientOptions: SonarCloudClientOptions,
  input: PullRequestReportInput,
): Promise<PullRequestReport> {
  const projectKey = input.projectKey.trim();
  const pullRequest = input.pullRequest.trim();

  if (!projectKey) {
    throw new Error("Missing projectKey");
  }

  if (!pullRequest) {
    throw new Error("Missing pullRequest");
  }

  const baseUrl = (clientOptions.baseUrl ?? "https://sonarcloud.io").replace(/\/$/, "");
  const client = new SonarCloudClient(clientOptions);

  const [projectStatusResponse, issuesResponse, measuresResponse] = await Promise.all([
    client.getProjectStatus(projectKey, pullRequest),
    client.getIssuesFacets(projectKey, pullRequest),
    client.getMeasures(projectKey, pullRequest),
  ]);

  const issueStatuses = issuesResponse.facets.find((facet) => facet.property === "issueStatuses");
  const newIssues = sumCounts(issueStatuses?.values, ["OPEN", "CONFIRMED", "REOPENED"]);
  const acceptedIssues = sumCounts(issueStatuses?.values, ["ACCEPTED"]);

  return {
    analysisUrl: `${baseUrl}/dashboard?id=${encodeURIComponent(projectKey)}&pullRequest=${encodeURIComponent(pullRequest)}`,
    failingQualityGateConditions: projectStatusResponse.projectStatus.conditions
      .filter((condition) => condition.status !== "OK")
      .map((condition) => ({
        actualValue: condition.actualValue,
        comparator: condition.comparator,
        errorThreshold: condition.errorThreshold,
        metricKey: condition.metricKey,
      })),
    issueCounts: {
      acceptedIssues,
      newIssues,
    },
    measures: {
      coverageOnNewCode: measureValue(measuresResponse.component.measures, "new_coverage"),
      duplicationOnNewCode: measureValue(
        measuresResponse.component.measures,
        "new_duplicated_lines_density",
      ),
      securityHotspots: measureValue(measuresResponse.component.measures, "new_security_hotspots"),
    },
    projectKey,
    pullRequest,
    qualityGateStatus: projectStatusResponse.projectStatus.status,
  };
}

function sumCounts(values: Array<IssuesFacetValue> | undefined, keys: Array<string>): number {
  if (!values) {
    return 0;
  }

  return values
    .filter((item) => keys.includes(item.val))
    .reduce((total, item) => total + item.count, 0);
}

function measureValue(
  measures: Array<{ metric: string; periods?: Array<{ value: string }>; value?: string }>,
  metric: string,
): number {
  const measure = measures.find((item) => item.metric === metric);
  const rawValue = measure?.periods?.[0]?.value ?? measure?.value ?? "0";
  const parsed = Number.parseFloat(rawValue);
  return Number.isFinite(parsed) ? parsed : 0;
}
