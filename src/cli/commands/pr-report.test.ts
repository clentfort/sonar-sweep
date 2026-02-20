import { afterEach, describe, expect, it, vi } from 'vitest'
import yargs from 'yargs/yargs'

import { builder, handler } from './pr-report.js'

const { getPullRequestReportMock } = vi.hoisted(() => ({
  getPullRequestReportMock: vi.fn(),
}))

vi.mock('../../service/pr-report.js', () => ({
  getPullRequestReport: getPullRequestReportMock,
}))

describe('pr-report command', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('builds command options', () => {
    const result = builder(yargs([]))
    expect(result).toBeDefined()
  })

  it('prints human output by default', async () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    getPullRequestReportMock.mockResolvedValue({
      projectKey: 'project',
      pullRequest: '42',
      qualityGateStatus: 'OK',
      failingQualityGateConditions: [],
      analysisUrl: 'https://sonar/dashboard?id=project&pullRequest=42',
      issueCounts: {
        newIssues: 1,
        acceptedIssues: 2,
      },
      measures: {
        securityHotspots: 0,
        coverageOnNewCode: 91.234,
        duplicationOnNewCode: 1,
      },
    })

    await handler({
      token: 'token',
      baseUrl: 'https://sonar',
      projectKey: 'project',
      pullRequest: '42',
      json: false,
    })

    const output = stdout.mock.calls.map((call) => call[0]).join('')
    expect(output).toContain('Quality Gate passed')
    expect(output).toContain('- 1 New issues')
    expect(output).toContain('- 91.2% Coverage on New Code')
  })

  it('prints JSON when requested', async () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    getPullRequestReportMock.mockResolvedValue({
      projectKey: 'project',
      pullRequest: '42',
      qualityGateStatus: 'ERROR',
      failingQualityGateConditions: [
        {
          metricKey: 'new_coverage',
          comparator: 'LT',
          errorThreshold: '80',
          actualValue: '75',
        },
      ],
      analysisUrl: 'https://sonar/dashboard?id=project&pullRequest=42',
      issueCounts: {
        newIssues: 0,
        acceptedIssues: 0,
      },
      measures: {
        securityHotspots: 1,
        coverageOnNewCode: 75,
        duplicationOnNewCode: 0,
      },
    })

    await handler({
      token: 'token',
      baseUrl: 'https://sonar',
      projectKey: 'project',
      pullRequest: '42',
      json: true,
    })

    expect(stdout).toHaveBeenCalledTimes(1)
    expect(String(stdout.mock.calls[0]?.[0])).toContain('"qualityGateStatus": "ERROR"')
    expect(String(stdout.mock.calls[0]?.[0])).toContain('"metricKey": "new_coverage"')
  })
})
