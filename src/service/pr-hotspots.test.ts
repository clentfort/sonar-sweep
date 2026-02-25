import { describe, expect, it, vi } from 'vitest'

import { getPullRequestHotspots } from './pr-hotspots.js'

describe('getPullRequestHotspots', () => {
  it('maps Sonar hotspots into a stable report shape', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          paging: { pageIndex: 1, pageSize: 100, total: 1 },
          hotspots: [
            {
              key: 'AZ-HOTSPOT-1',
              component: 'my_project:src/config.ts',
              project: 'my_project',
              securityCategory: 'others',
              vulnerabilityProbability: 'MEDIUM',
              status: 'TO_REVIEW',
              line: 15,
              message: 'Make sure this is safe.',
            },
          ],
          components: [
            {
              key: 'my_project:src/config.ts',
              path: 'src/config.ts',
            },
          ],
        }),
      ),
    )

    const result = await getPullRequestHotspots(
      {
        token: 'token',
        baseUrl: 'https://sonarcloud.io',
        fetchImpl: fetchMock,
      },
      {
        projectKey: 'my_project',
        pullRequest: '123',
        page: 1,
        pageSize: 100,
      },
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      projectKey: 'my_project',
      pullRequest: '123',
      total: 1,
      page: 1,
      pageSize: 100,
      analysisUrl: 'https://sonarcloud.io/project/security_hotspots?id=my_project&pullRequest=123',
      hotspots: [
        {
          key: 'AZ-HOTSPOT-1',
          message: 'Make sure this is safe.',
          file: 'src/config.ts',
          line: 15,
          securityCategory: 'others',
          vulnerabilityProbability: 'MEDIUM',
          status: 'TO_REVIEW',
          resolution: undefined,
        },
      ],
    })
  })

  it('extracts file path from component key when no component map entry', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          paging: { pageIndex: 1, pageSize: 100, total: 1 },
          hotspots: [
            {
              key: 'AZ-HOTSPOT-2',
              component: 'my_project:src/other.ts',
              project: 'my_project',
              securityCategory: 'command-injection',
              vulnerabilityProbability: 'HIGH',
              status: 'TO_REVIEW',
              line: 42,
              message: 'Check command injection.',
            },
          ],
          components: [], // No component mapping
        }),
      ),
    )

    const result = await getPullRequestHotspots(
      {
        token: 'token',
        baseUrl: 'https://sonarcloud.io',
        fetchImpl: fetchMock,
      },
      {
        projectKey: 'my_project',
        pullRequest: '456',
      },
    )

    expect(result.hotspots[0].file).toBe('src/other.ts')
  })

  it('throws error when projectKey is missing', async () => {
    const fetchMock = vi.fn<typeof fetch>()

    await expect(
      getPullRequestHotspots(
        { token: 'token', fetchImpl: fetchMock },
        { projectKey: '', pullRequest: '123' },
      ),
    ).rejects.toThrow('Missing projectKey')

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('throws error when pullRequest is missing', async () => {
    const fetchMock = vi.fn<typeof fetch>()

    await expect(
      getPullRequestHotspots(
        { token: 'token', fetchImpl: fetchMock },
        { projectKey: 'my_project', pullRequest: '' },
      ),
    ).rejects.toThrow('Missing pullRequest')

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
