import { afterEach, describe, expect, it, vi } from 'vitest'
import yargs from 'yargs/yargs'

import { builder, handler } from './pr-hotspots.js'

const { getPullRequestHotspotsMock } = vi.hoisted(() => ({
  getPullRequestHotspotsMock: vi.fn(),
}))

vi.mock('../../service/pr-hotspots.js', () => ({
  getPullRequestHotspots: getPullRequestHotspotsMock,
}))

vi.mock('../project-key.js', () => ({
  resolveProjectKey: (key?: string) => key ?? 'auto-detected-project',
}))

describe('pr-hotspots command', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('builds command options', () => {
    expect(builder(yargs([]))).toBeDefined()
  })

  it('prints human-readable output for hotspots', async () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    getPullRequestHotspotsMock.mockResolvedValue({
      projectKey: 'my_project',
      pullRequest: '123',
      total: 2,
      page: 1,
      pageSize: 100,
      analysisUrl: 'https://sonarcloud.io/project/security_hotspots?id=my_project&pullRequest=123',
      hotspots: [
        {
          key: 'AZ-1',
          message: 'Check this input',
          file: 'src/handler.ts',
          line: 42,
          securityCategory: 'command-injection',
          vulnerabilityProbability: 'HIGH',
          status: 'TO_REVIEW',
        },
        {
          key: 'AZ-2',
          message: 'Verify config',
          file: 'src/config.ts',
          line: 10,
          securityCategory: 'others',
          vulnerabilityProbability: 'LOW',
          status: 'TO_REVIEW',
        },
      ],
    })

    await handler({
      token: 'token',
      baseUrl: 'https://sonarcloud.io',
      pullRequest: '123',
      status: 'TO_REVIEW',
      page: 1,
      pageSize: 100,
      json: false,
    })

    const output = stdout.mock.calls.map((call) => call[0]).join('')
    expect(output).toContain('Found 2 unreviewed security hotspot(s)')
    expect(output).toContain('[HIGH] AZ-1')
    expect(output).toContain('src/handler.ts:42')
    expect(output).toContain('[LOW] AZ-2')
  })

  it('prints JSON output when --json flag is set', async () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const mockResult = {
      projectKey: 'my_project',
      pullRequest: '123',
      total: 1,
      page: 1,
      pageSize: 100,
      analysisUrl: 'https://sonarcloud.io/project/security_hotspots?id=my_project&pullRequest=123',
      hotspots: [
        {
          key: 'AZ-1',
          message: 'Check this',
          file: 'src/app.ts',
          line: 5,
          securityCategory: 'others',
          vulnerabilityProbability: 'MEDIUM',
          status: 'TO_REVIEW',
        },
      ],
    }
    getPullRequestHotspotsMock.mockResolvedValue(mockResult)

    await handler({
      token: 'token',
      baseUrl: 'https://sonarcloud.io',
      pullRequest: '123',
      status: 'TO_REVIEW',
      page: 1,
      pageSize: 100,
      json: true,
    })

    const output = stdout.mock.calls.map((call) => call[0]).join('')
    expect(JSON.parse(output)).toEqual(mockResult)
  })

  it('prints message when no hotspots found', async () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    getPullRequestHotspotsMock.mockResolvedValue({
      projectKey: 'my_project',
      pullRequest: '123',
      total: 0,
      page: 1,
      pageSize: 100,
      analysisUrl: 'https://sonarcloud.io/project/security_hotspots?id=my_project&pullRequest=123',
      hotspots: [],
    })

    await handler({
      token: 'token',
      baseUrl: 'https://sonarcloud.io',
      pullRequest: '123',
      status: 'TO_REVIEW',
      page: 1,
      pageSize: 100,
      json: false,
    })

    const output = stdout.mock.calls.map((call) => call[0]).join('')
    expect(output).toContain('Found 0 unreviewed security hotspot(s)')
    expect(output).toContain('See analysis details')
  })
})
