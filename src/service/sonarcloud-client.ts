export type SonarCloudClientOptions = {
  token: string
  baseUrl?: string
  fetchImpl?: typeof fetch
}

export type QualityGateCondition = {
  status: string
  metricKey: string
  comparator: string
  errorThreshold?: string
  actualValue?: string
}

export type ProjectStatusResponse = {
  projectStatus: {
    status: string
    conditions: QualityGateCondition[]
  }
}

export type IssuesFacetValue = {
  val: string
  count: number
}

export type IssuesSearchResponse = {
  total: number
  paging?: {
    pageIndex: number
    pageSize: number
    total: number
  }
  issues?: SonarIssue[]
  components?: SonarIssueComponent[]
  facets: Array<{
    property: string
    values: IssuesFacetValue[]
  }>
}

export type SonarIssue = {
  key: string
  rule: string
  severity: string
  component: string
  line?: number
  status: string
  issueStatus?: string
  message: string
  type: string
  effort?: string
}

export type SonarIssueComponent = {
  key: string
  path?: string
  longName?: string
}

export type SonarHotspot = {
  key: string
  component: string
  project: string
  securityCategory: string
  vulnerabilityProbability: string
  status: string
  resolution?: string
  line?: number
  message: string
  author?: string
  creationDate?: string
  updateDate?: string
}

export type HotspotsSearchResponse = {
  paging: {
    pageIndex: number
    pageSize: number
    total: number
  }
  hotspots: SonarHotspot[]
  components?: SonarIssueComponent[]
}

export type HotspotResolution = 'SAFE' | 'ACKNOWLEDGED' | 'FIXED'

export type MeasuresResponse = {
  component: {
    measures: Array<{
      metric: string
      value?: string
      periods?: Array<{
        index: number
        value: string
      }>
    }>
  }
}

export type ComponentTreeResponse = {
  paging: {
    pageIndex: number
    pageSize: number
    total: number
  }
  components: Array<{
    key: string
    path?: string
    name: string
    measures: Array<{
      metric: string
      value?: string
      periods?: Array<{
        index: number
        value: string
      }>
    }>
  }>
}

export class SonarCloudClient {
  private readonly token: string
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: SonarCloudClientOptions) {
    if (!options.token?.trim()) {
      throw new Error('Missing Sonar token')
    }

    this.token = options.token.trim()
    this.baseUrl = (options.baseUrl ?? 'https://sonarcloud.io').replace(/\/$/, '')
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async getProjectStatus(projectKey: string, pullRequest: string): Promise<ProjectStatusResponse> {
    return this.get('/api/qualitygates/project_status', {
      projectKey,
      pullRequest,
    })
  }

  async getIssuesFacets(projectKey: string, pullRequest: string): Promise<IssuesSearchResponse> {
    return this.get('/api/issues/search', {
      componentKeys: projectKey,
      pullRequest,
      inNewCodePeriod: 'true',
      facets: 'issueStatuses',
      ps: '1',
    })
  }

  async getPullRequestIssues(
    projectKey: string,
    pullRequest: string,
    page = 1,
    pageSize = 100,
  ): Promise<IssuesSearchResponse> {
    return this.get('/api/issues/search', {
      componentKeys: projectKey,
      pullRequest,
      inNewCodePeriod: 'true',
      resolved: 'false',
      p: String(page),
      ps: String(pageSize),
    })
  }

  async getMeasures(projectKey: string, pullRequest: string): Promise<MeasuresResponse> {
    return this.get('/api/measures/component', {
      component: projectKey,
      pullRequest,
      metricKeys: 'new_security_hotspots,new_coverage,new_duplicated_lines_density',
    })
  }

  async getCoverageComponentTree(
    projectKey: string,
    pullRequest: string,
    page = 1,
    pageSize = 100,
  ): Promise<ComponentTreeResponse> {
    return this.get('/api/measures/component_tree', {
      component: projectKey,
      pullRequest,
      qualifiers: 'FIL',
      metricKeys: 'new_coverage,new_lines_to_cover,new_uncovered_lines',
      p: String(page),
      ps: String(pageSize),
    })
  }

  async getSourceRaw(componentKey: string, pullRequest: string): Promise<string> {
    const url = new URL('/api/sources/raw', this.baseUrl)
    url.searchParams.set('key', componentKey)
    url.searchParams.set('pullRequest', pullRequest)

    const response = await this.fetchImpl(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Sonar API request failed (${response.status}) for /api/sources/raw: ${body}`)
    }

    return response.text()
  }

  async doIssueTransition(issueKey: string, transition: string, comment?: string): Promise<void> {
    await this.post('/api/issues/do_transition', {
      issue: issueKey,
      transition,
      ...(comment ? { comment } : {}),
    })
  }

  async getHotspots(
    projectKey: string,
    pullRequest: string,
    status: 'TO_REVIEW' | 'REVIEWED' = 'TO_REVIEW',
    page = 1,
    pageSize = 100,
  ): Promise<HotspotsSearchResponse> {
    return this.get('/api/hotspots/search', {
      projectKey,
      pullRequest,
      status,
      p: String(page),
      ps: String(pageSize),
    })
  }

  async changeHotspotStatus(
    hotspotKey: string,
    status: 'REVIEWED' | 'TO_REVIEW',
    resolution?: HotspotResolution,
    comment?: string,
  ): Promise<void> {
    await this.post('/api/hotspots/change_status', {
      hotspot: hotspotKey,
      status,
      ...(resolution ? { resolution } : {}),
      ...(comment ? { comment } : {}),
    })
  }

  private async get<T>(path: string, query: Record<string, string>): Promise<T> {
    const url = new URL(path, this.baseUrl)
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value)
    }

    const response = await this.fetchImpl(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Sonar API request failed (${response.status}) for ${path}: ${body}`)
    }

    return (await response.json()) as T
  }

  private async post(path: string, form: Record<string, string>): Promise<void> {
    const url = new URL(path, this.baseUrl)
    const body = new URLSearchParams(form)

    const response = await this.fetchImpl(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body,
    })

    if (!response.ok) {
      const responseBody = await response.text()
      throw new Error(`Sonar API request failed (${response.status}) for ${path}: ${responseBody}`)
    }
  }
}
