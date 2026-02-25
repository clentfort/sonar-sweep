export type SonarCloudClientOptions = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  token: string;
};

export type QualityGateCondition = {
  actualValue?: string;
  comparator: string;
  errorThreshold?: string;
  metricKey: string;
  status: string;
};

export type ProjectStatusResponse = {
  projectStatus: {
    conditions: Array<QualityGateCondition>;
    status: string;
  };
};

export type IssuesFacetValue = {
  count: number;
  val: string;
};

export type IssuesSearchResponse = {
  components?: Array<SonarIssueComponent>;
  facets: Array<{
    property: string;
    values: Array<IssuesFacetValue>;
  }>;
  issues?: Array<SonarIssue>;
  paging?: {
    pageIndex: number;
    pageSize: number;
    total: number;
  };
  total: number;
};

export type SonarIssue = {
  component: string;
  effort?: string;
  issueStatus?: string;
  key: string;
  line?: number;
  message: string;
  rule: string;
  severity: string;
  status: string;
  type: string;
};

export type SonarIssueComponent = {
  key: string;
  longName?: string;
  path?: string;
};

export type SonarHotspot = {
  author?: string;
  component: string;
  creationDate?: string;
  key: string;
  line?: number;
  message: string;
  project: string;
  resolution?: string;
  securityCategory: string;
  status: string;
  updateDate?: string;
  vulnerabilityProbability: string;
};

export type HotspotsSearchResponse = {
  components?: Array<SonarIssueComponent>;
  hotspots: Array<SonarHotspot>;
  paging: {
    pageIndex: number;
    pageSize: number;
    total: number;
  };
};

export type HotspotResolution = "SAFE" | "ACKNOWLEDGED" | "FIXED";

export type MeasuresResponse = {
  component: {
    measures: Array<{
      metric: string;
      periods?: Array<{
        index: number;
        value: string;
      }>;
      value?: string;
    }>;
  };
};

export type ComponentTreeResponse = {
  components: Array<{
    key: string;
    measures: Array<{
      metric: string;
      periods?: Array<{
        index: number;
        value: string;
      }>;
      value?: string;
    }>;
    name: string;
    path?: string;
  }>;
  paging: {
    pageIndex: number;
    pageSize: number;
    total: number;
  };
};

export class SonarCloudClient {
  private readonly token: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: SonarCloudClientOptions) {
    if (!options.token?.trim()) {
      throw new Error("Missing Sonar token");
    }

    this.token = options.token.trim();
    this.baseUrl = (options.baseUrl ?? "https://sonarcloud.io").replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getProjectStatus(projectKey: string, pullRequest: string): Promise<ProjectStatusResponse> {
    return this.get("/api/qualitygates/project_status", {
      projectKey,
      pullRequest,
    });
  }

  async getIssuesFacets(projectKey: string, pullRequest: string): Promise<IssuesSearchResponse> {
    return this.get("/api/issues/search", {
      componentKeys: projectKey,
      facets: "issueStatuses",
      inNewCodePeriod: "true",
      ps: "1",
      pullRequest,
    });
  }

  async getPullRequestIssues(
    projectKey: string,
    pullRequest: string,
    page = 1,
    pageSize = 100,
  ): Promise<IssuesSearchResponse> {
    return this.get("/api/issues/search", {
      componentKeys: projectKey,
      inNewCodePeriod: "true",
      p: String(page),
      ps: String(pageSize),
      pullRequest,
      resolved: "false",
    });
  }

  async getMeasures(projectKey: string, pullRequest: string): Promise<MeasuresResponse> {
    return this.get("/api/measures/component", {
      component: projectKey,
      metricKeys: "new_security_hotspots,new_coverage,new_duplicated_lines_density",
      pullRequest,
    });
  }

  async getCoverageComponentTree(
    projectKey: string,
    pullRequest: string,
    page = 1,
    pageSize = 100,
  ): Promise<ComponentTreeResponse> {
    return this.get("/api/measures/component_tree", {
      component: projectKey,
      metricKeys: "new_coverage,new_lines_to_cover,new_uncovered_lines",
      p: String(page),
      ps: String(pageSize),
      pullRequest,
      qualifiers: "FIL",
    });
  }

  async getSourceRaw(componentKey: string, pullRequest: string): Promise<string> {
    const url = new URL("/api/sources/raw", this.baseUrl);
    url.searchParams.set("key", componentKey);
    url.searchParams.set("pullRequest", pullRequest);

    const response = await this.fetchImpl(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      method: "GET",
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Sonar API request failed (${response.status}) for /api/sources/raw: \${body}`,
      );
    }

    return response.text();
  }

  async doIssueTransition(issueKey: string, transition: string, comment?: string): Promise<void> {
    await this.post("/api/issues/do_transition", {
      issue: issueKey,
      transition,
      ...(comment ? { comment } : {}),
    });
  }

  async getHotspots(
    projectKey: string,
    pullRequest: string,
    status: "TO_REVIEW" | "REVIEWED" = "TO_REVIEW",
    page = 1,
    pageSize = 100,
  ): Promise<HotspotsSearchResponse> {
    return this.get("/api/hotspots/search", {
      p: String(page),
      projectKey,
      ps: String(pageSize),
      pullRequest,
      status,
    });
  }

  async changeHotspotStatus(
    hotspotKey: string,
    status: "REVIEWED" | "TO_REVIEW",
    resolution?: HotspotResolution,
    comment?: string,
  ): Promise<void> {
    await this.post("/api/hotspots/change_status", {
      hotspot: hotspotKey,
      status,
      ...(resolution ? { resolution } : {}),
      ...(comment ? { comment } : {}),
    });
  }

  private async get<T>(path: string, query: Record<string, string>): Promise<T> {
    const url = new URL(path, this.baseUrl);
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }

    const response = await this.fetchImpl(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      method: "GET",
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Sonar API request failed (\${response.status}) for \${path}: \${body}`);
    }

    return (await response.json()) as T;
  }

  private async post(path: string, form: Record<string, string>): Promise<void> {
    const url = new URL(path, this.baseUrl);
    const body = new URLSearchParams(form);

    const response = await this.fetchImpl(url, {
      body,
      headers: {
        Authorization: `Bearer \${this.token}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });

    if (!response.ok) {
      const responseBody = await response.text();
      throw new Error(`Sonar API request failed (\${response.status}) for \${path}: \${responseBody}`);
    }
  }
}
