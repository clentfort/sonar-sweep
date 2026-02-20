import { describe, expect, it, vi } from 'vitest'

import { getPullRequestReport } from './pr-report.js'

describe('getPullRequestReport', () => {
  it('aggregates status, issues, and measures', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            projectStatus: {
              status: 'OK',
              conditions: [
                {
                  status: 'OK',
                  metricKey: 'new_coverage',
                  comparator: 'LT',
                  errorThreshold: '80',
                  actualValue: '82.5',
                },
              ],
            },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            total: 4,
            facets: [
              {
                property: 'issueStatuses',
                values: [
                  { val: 'OPEN', count: 2 },
                  { val: 'CONFIRMED', count: 1 },
                  { val: 'ACCEPTED', count: 1 },
                ],
              },
            ],
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            component: {
              measures: [
                { metric: 'new_security_hotspots', periods: [{ index: 1, value: '3' }] },
                { metric: 'new_coverage', periods: [{ index: 1, value: '82.5' }] },
                { metric: 'new_duplicated_lines_density', periods: [{ index: 1, value: '1.2' }] },
              ],
            },
          }),
        ),
      )

    const report = await getPullRequestReport(
      {
        token: 'token',
        baseUrl: 'https://sonarcloud.io',
        fetchImpl: fetchMock,
      },
      {
        projectKey: 'my_project',
        pullRequest: '123',
      },
    )

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(report).toEqual({
      projectKey: 'my_project',
      pullRequest: '123',
      qualityGateStatus: 'OK',
      failingQualityGateConditions: [],
      analysisUrl: 'https://sonarcloud.io/dashboard?id=my_project&pullRequest=123',
      issueCounts: {
        newIssues: 3,
        acceptedIssues: 1,
      },
      measures: {
        securityHotspots: 3,
        coverageOnNewCode: 82.5,
        duplicationOnNewCode: 1.2,
      },
    })
  })

  it('fails when project key is missing', async () => {
    await expect(
      getPullRequestReport(
        {
          token: 'token',
          fetchImpl: vi.fn(),
        },
        {
          projectKey: ' ',
          pullRequest: '123',
        },
      ),
    ).rejects.toThrow('Missing projectKey')
  })

  it('exposes failing quality gate conditions', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            projectStatus: {
              status: 'ERROR',
              conditions: [
                {
                  status: 'ERROR',
                  metricKey: 'new_coverage',
                  comparator: 'LT',
                  errorThreshold: '80',
                  actualValue: '60.3',
                },
              ],
            },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            total: 0,
            facets: [{ property: 'issueStatuses', values: [] }],
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            component: {
              measures: [],
            },
          }),
        ),
      )

    const report = await getPullRequestReport(
      {
        token: 'token',
        fetchImpl: fetchMock,
      },
      {
        projectKey: 'my_project',
        pullRequest: '123',
      },
    )

    expect(report.failingQualityGateConditions).toEqual([
      {
        metricKey: 'new_coverage',
        comparator: 'LT',
        errorThreshold: '80',
        actualValue: '60.3',
      },
    ])
  })
})
