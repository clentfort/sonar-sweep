import {
  SonarCloudClient,
  type SonarCloudClientOptions,
  type SonarHotspot,
} from "./sonarcloud-client.js";

export type PullRequestHotspot = {
  file: string;
  key: string;
  line?: number;
  message: string;
  resolution?: string;
  securityCategory: string;
  status: string;
  vulnerabilityProbability: string;
};

export type PullRequestHotspotsResult = {
  analysisUrl: string;
  hotspots: Array<PullRequestHotspot>;
  page: number;
  pageSize: number;
  projectKey: string;
  pullRequest: string;
  total: number;
};

export type PullRequestHotspotsInput = {
  page?: number;
  pageSize?: number;
  projectKey: string;
  pullRequest: string;
  status?: "TO_REVIEW" | "REVIEWED";
};

export async function getPullRequestHotspots(
  clientOptions: SonarCloudClientOptions,
  input: PullRequestHotspotsInput,
): Promise<PullRequestHotspotsResult> {
  const projectKey = input.projectKey.trim();
  const pullRequest = input.pullRequest.trim();
  const status = input.status ?? "TO_REVIEW";
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 100;

  if (!projectKey) {
    throw new Error("Missing projectKey");
  }

  if (!pullRequest) {
    throw new Error("Missing pullRequest");
  }

  const baseUrl = (clientOptions.baseUrl ?? "https://sonarcloud.io").replace(/\/$/, "");
  const client = new SonarCloudClient(clientOptions);

  const response = await client.getHotspots(projectKey, pullRequest, status, page, pageSize);

  const componentMap = new Map<string, string>();
  for (const component of response.components ?? []) {
    componentMap.set(component.key, component.path ?? component.longName ?? component.key);
  }

  const hotspots: Array<PullRequestHotspot> = response.hotspots.map((hotspot: SonarHotspot) => ({
    file: extractFilePath(hotspot.component, projectKey, componentMap),
    key: hotspot.key,
    line: hotspot.line,
    message: hotspot.message,
    resolution: hotspot.resolution,
    securityCategory: hotspot.securityCategory,
    status: hotspot.status,
    vulnerabilityProbability: hotspot.vulnerabilityProbability,
  }));

  return {
    analysisUrl: `${baseUrl}/project/security_hotspots?id=${encodeURIComponent(projectKey)}&pullRequest=${encodeURIComponent(pullRequest)}`,
    hotspots,
    page: response.paging.pageIndex,
    pageSize: response.paging.pageSize,
    projectKey,
    pullRequest,
    total: response.paging.total,
  };
}

function extractFilePath(
  componentKey: string,
  projectKey: string,
  componentMap: Map<string, string>,
): string {
  // First check the component map
  const mappedPath = componentMap.get(componentKey);
  if (mappedPath) {
    return mappedPath;
  }

  // Fallback: extract path from component key (format: projectKey:path/to/file)
  const prefix = `${projectKey}:`;
  if (componentKey.startsWith(prefix)) {
    return componentKey.slice(prefix.length);
  }

  return componentKey;
}
