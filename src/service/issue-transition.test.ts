import { describe, expect, it, vi } from 'vitest'

import { transitionIssue } from './issue-transition.js'

describe('transitionIssue', () => {
  it('sends issue transition to Sonar', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 200 }))

    const result = await transitionIssue(
      {
        token: 'token',
        fetchImpl: fetchMock,
      },
      {
        issueKey: 'AZ-1',
        transition: 'accept',
        comment: 'Accepted for now',
      },
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      issueKey: 'AZ-1',
      transition: 'accept',
      applied: true,
    })
  })
})
