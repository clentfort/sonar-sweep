import { describe, expect, it, vi } from 'vitest'

import { getPullRequestReview } from './pr-review.js'

describe('getPullRequestReview', () => {
  it('includes issue snippets from source lines', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            total: 1,
            paging: { pageIndex: 1, pageSize: 20, total: 1 },
            issues: [
              {
                key: 'AZ-1',
                rule: 'ts:S1',
                severity: 'MINOR',
                component: 'my_project:src/app.ts',
                line: 3,
                status: 'OPEN',
                issueStatus: 'OPEN',
                message: 'Fix this.',
                type: 'CODE_SMELL',
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
      .mockResolvedValueOnce(new Response(['a', 'b', 'c', 'd', 'e'].join('\n')))

    const report = await getPullRequestReview(
      {
        token: 'token',
        fetchImpl: fetchMock,
      },
      {
        projectKey: 'my_project',
        pullRequest: '123',
        contextLines: 1,
      },
    )

    expect(report.total).toBe(1)
    expect(report.issues[0]?.file).toBe('src/app.ts')
    expect(report.issues[0]?.snippet?.lines).toEqual([
      { line: 2, text: 'b', highlight: false },
      { line: 3, text: 'c', highlight: true },
      { line: 4, text: 'd', highlight: false },
    ])
  })
})
