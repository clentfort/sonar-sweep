import { describe, expect, it, vi } from 'vitest'

import { getPullRequestIssues } from './pr-issues.js'

describe('getPullRequestIssues', () => {
  it('maps Sonar issues into a stable report shape', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          total: 1,
          paging: { pageIndex: 1, pageSize: 50, total: 1 },
          issues: [
            {
              key: 'AZ-1',
              rule: 'ts:S1234',
              severity: 'MAJOR',
              component: 'my_project:src/app.ts',
              line: 42,
              status: 'OPEN',
              issueStatus: 'OPEN',
              message: 'Fix this.',
              type: 'CODE_SMELL',
              effort: '5min',
            },
          ],
          components: [
            {
              key: 'my_project:src/app.ts',
              path: 'src/app.ts',
            },
          ],
          facets: [],
        }),
      ),
    )

    const report = await getPullRequestIssues(
      {
        token: 'token',
        baseUrl: 'https://sonarcloud.io',
        fetchImpl: fetchMock,
      },
      {
        projectKey: 'my_project',
        pullRequest: '123',
        page: 1,
        pageSize: 50,
      },
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(report).toEqual({
      projectKey: 'my_project',
      pullRequest: '123',
      total: 1,
      page: 1,
      pageSize: 50,
      analysisUrl: 'https://sonarcloud.io/dashboard?id=my_project&pullRequest=123',
      issues: [
        {
          key: 'AZ-1',
          type: 'CODE_SMELL',
          severity: 'MAJOR',
          status: 'OPEN',
          issueStatus: 'OPEN',
          rule: 'ts:S1234',
          message: 'Fix this.',
          file: 'src/app.ts',
          line: 42,
          effort: '5min',
        },
      ],
    })
  })
})
