import { describe, expect, it, vi } from 'vitest'

import { reviewHotspot } from './hotspot-transition.js'

describe('reviewHotspot', () => {
  it('sends hotspot review to Sonar with SAFE resolution', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 200 }))

    const result = await reviewHotspot(
      {
        token: 'token',
        fetchImpl: fetchMock,
      },
      {
        hotspotKey: 'AZ-HOTSPOT-1',
        resolution: 'SAFE',
        comment: 'Not a security risk',
      },
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      hotspotKey: 'AZ-HOTSPOT-1',
      status: 'REVIEWED',
      resolution: 'SAFE',
      applied: true,
    })
  })

  it('sends hotspot review with ACKNOWLEDGED resolution', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 200 }))

    const result = await reviewHotspot(
      {
        token: 'token',
        fetchImpl: fetchMock,
      },
      {
        hotspotKey: 'AZ-HOTSPOT-2',
        resolution: 'ACKNOWLEDGED',
      },
    )

    expect(result).toEqual({
      hotspotKey: 'AZ-HOTSPOT-2',
      status: 'REVIEWED',
      resolution: 'ACKNOWLEDGED',
      applied: true,
    })
  })

  it('sends hotspot review with FIXED resolution', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 200 }))

    const result = await reviewHotspot(
      {
        token: 'token',
        fetchImpl: fetchMock,
      },
      {
        hotspotKey: 'AZ-HOTSPOT-3',
        resolution: 'FIXED',
        comment: 'Fixed in this PR',
      },
    )

    expect(result).toEqual({
      hotspotKey: 'AZ-HOTSPOT-3',
      status: 'REVIEWED',
      resolution: 'FIXED',
      applied: true,
    })
  })

  it('throws error when hotspotKey is missing', async () => {
    const fetchMock = vi.fn<typeof fetch>()

    await expect(
      reviewHotspot(
        { token: 'token', fetchImpl: fetchMock },
        { hotspotKey: '', resolution: 'SAFE' },
      ),
    ).rejects.toThrow('Missing hotspotKey')

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
