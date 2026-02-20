import { afterEach, describe, expect, it, vi } from 'vitest'
import yargs from 'yargs/yargs'

import { builder, handler } from './pr-review.js'

const { getPullRequestReviewMock } = vi.hoisted(() => ({
  getPullRequestReviewMock: vi.fn(),
}))

vi.mock('../../service/pr-review.js', () => ({
  getPullRequestReview: getPullRequestReviewMock,
}))

describe('pr-review command', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('builds command options', () => {
    expect(builder(yargs([]))).toBeDefined()
  })

  it('prints contextual review output', async () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    getPullRequestReviewMock.mockResolvedValue({
      projectKey: 'project',
      pullRequest: '42',
      total: 1,
      analysisUrl: 'https://sonar/dashboard?id=project&pullRequest=42',
      issues: [
        {
          key: 'AZ-1',
          type: 'CODE_SMELL',
          severity: 'MINOR',
          status: 'OPEN',
          issueStatus: 'OPEN',
          rule: 'ts:S1',
          message: 'Fix this.',
          file: 'src/app.ts',
          line: 10,
          issueUrl: 'https://sonar/issue',
          snippet: {
            startLine: 9,
            endLine: 11,
            lines: [
              { line: 9, text: 'x', highlight: false },
              { line: 10, text: 'y', highlight: true },
              { line: 11, text: 'z', highlight: false },
            ],
          },
        },
      ],
    })

    await handler({
      token: 'token',
      baseUrl: 'https://sonar',
      projectKey: 'project',
      pullRequest: '42',
      contextLines: 3,
      page: 1,
      pageSize: 20,
      json: false,
    })

    const output = stdout.mock.calls.map((call) => call[0]).join('')
    expect(output).toContain('Found 1 open issue(s)')
    expect(output).toContain('Context:')
    expect(output).toContain('>   10 | y')
  })
})
