import { afterEach, describe, expect, it, vi } from 'vitest'
import yargs from 'yargs/yargs'

import { builder, handler } from './issue-accept.js'

const { transitionIssueMock } = vi.hoisted(() => ({
  transitionIssueMock: vi.fn(),
}))

vi.mock('../../service/issue-transition.js', () => ({
  transitionIssue: transitionIssueMock,
}))

describe('issue-accept command', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('builds command options', () => {
    expect(builder(yargs([]))).toBeDefined()
  })

  it('prints success output', async () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    transitionIssueMock.mockResolvedValue({
      issueKey: 'AZ-1',
      transition: 'accept',
      applied: true,
    })

    await handler({
      token: 'token',
      baseUrl: 'https://sonar',
      issueKey: 'AZ-1',
      comment: 'accepted',
      json: false,
    })

    const output = stdout.mock.calls.map((call) => call[0]).join('')
    expect(output).toContain('Accepted issue AZ-1')
  })
})
