import { describe, expect, it, vi } from 'vitest'

import { getPullRequestCoverage } from './pr-coverage.js'

describe('getPullRequestCoverage', () => {
  it('returns files below threshold sorted by coverage', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          paging: { pageIndex: 1, pageSize: 500, total: 3 },
          components: [
            {
              key: 'a',
              path: 'src/a.ts',
              name: 'a.ts',
              measures: [
                { metric: 'new_coverage', periods: [{ index: 1, value: '60.0' }] },
                { metric: 'new_lines_to_cover', periods: [{ index: 1, value: '10' }] },
                { metric: 'new_uncovered_lines', periods: [{ index: 1, value: '4' }] },
              ],
            },
            {
              key: 'b',
              path: 'src/b.ts',
              name: 'b.ts',
              measures: [
                { metric: 'new_coverage', periods: [{ index: 1, value: '20.0' }] },
                { metric: 'new_lines_to_cover', periods: [{ index: 1, value: '5' }] },
                { metric: 'new_uncovered_lines', periods: [{ index: 1, value: '4' }] },
              ],
            },
            {
              key: 'c',
              path: 'src/c.ts',
              name: 'c.ts',
              measures: [
                { metric: 'new_coverage', periods: [{ index: 1, value: '100.0' }] },
                { metric: 'new_lines_to_cover', periods: [{ index: 1, value: '2' }] },
                { metric: 'new_uncovered_lines', periods: [{ index: 1, value: '0' }] },
              ],
            },
          ],
        }),
      ),
    )

    const report = await getPullRequestCoverage(
      {
        token: 'token',
        fetchImpl: fetchMock,
      },
      {
        projectKey: 'my_project',
        pullRequest: '123',
        threshold: 80,
      },
    )

    expect(report.files.map((item) => item.file)).toEqual(['src/b.ts', 'src/a.ts'])
  })
})
