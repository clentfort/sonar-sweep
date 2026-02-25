import { afterEach, describe, expect, it, vi } from 'vitest'
import yargs from 'yargs/yargs'

import { builder, handler } from './hotspot-review.js'

const { reviewHotspotMock } = vi.hoisted(() => ({
  reviewHotspotMock: vi.fn(),
}))

vi.mock('../../service/hotspot-transition.js', () => ({
  reviewHotspot: reviewHotspotMock,
}))

describe('hotspot-review command', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('builds command options', () => {
    expect(builder(yargs([]))).toBeDefined()
  })

  it('prints success output for SAFE resolution', async () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    reviewHotspotMock.mockResolvedValue({
      hotspotKey: 'AZ-HOTSPOT-1',
      status: 'REVIEWED',
      resolution: 'SAFE',
      applied: true,
    })

    await handler({
      token: 'token',
      baseUrl: 'https://sonarcloud.io',
      hotspotKey: 'AZ-HOTSPOT-1',
      resolution: 'SAFE',
      comment: 'Not a risk',
      json: false,
    })

    const output = stdout.mock.calls.map((call) => call[0]).join('')
    expect(output).toContain('Reviewed hotspot AZ-HOTSPOT-1 as SAFE')
  })

  it('prints success output for ACKNOWLEDGED resolution', async () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    reviewHotspotMock.mockResolvedValue({
      hotspotKey: 'AZ-HOTSPOT-2',
      status: 'REVIEWED',
      resolution: 'ACKNOWLEDGED',
      applied: true,
    })

    await handler({
      token: 'token',
      baseUrl: 'https://sonarcloud.io',
      hotspotKey: 'AZ-HOTSPOT-2',
      resolution: 'ACKNOWLEDGED',
      json: false,
    })

    const output = stdout.mock.calls.map((call) => call[0]).join('')
    expect(output).toContain('Reviewed hotspot AZ-HOTSPOT-2 as ACKNOWLEDGED')
  })

  it('prints success output for FIXED resolution', async () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    reviewHotspotMock.mockResolvedValue({
      hotspotKey: 'AZ-HOTSPOT-3',
      status: 'REVIEWED',
      resolution: 'FIXED',
      applied: true,
    })

    await handler({
      token: 'token',
      baseUrl: 'https://sonarcloud.io',
      hotspotKey: 'AZ-HOTSPOT-3',
      resolution: 'FIXED',
      comment: 'Fixed in this PR',
      json: false,
    })

    const output = stdout.mock.calls.map((call) => call[0]).join('')
    expect(output).toContain('Reviewed hotspot AZ-HOTSPOT-3 as FIXED')
  })

  it('prints JSON output when --json flag is set', async () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const mockResult = {
      hotspotKey: 'AZ-HOTSPOT-1',
      status: 'REVIEWED',
      resolution: 'SAFE',
      applied: true,
    }
    reviewHotspotMock.mockResolvedValue(mockResult)

    await handler({
      token: 'token',
      baseUrl: 'https://sonarcloud.io',
      hotspotKey: 'AZ-HOTSPOT-1',
      resolution: 'SAFE',
      json: true,
    })

    const output = stdout.mock.calls.map((call) => call[0]).join('')
    expect(JSON.parse(output)).toEqual(mockResult)
  })
})
