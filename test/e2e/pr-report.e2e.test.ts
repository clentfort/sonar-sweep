import { createServer } from 'node:http'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { runCli } from './support/run-cli.js'
import { setupCliProcess } from './support/setup-cli-process.js'

describe('pr-report e2e', () => {
  const { stdoutSpy, stderrSpy } = setupCliProcess()
  let server: ReturnType<typeof createServer>
  let baseUrl = ''

  beforeAll(async () => {
    server = createServer((request, response) => {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1')

      if (url.pathname === '/api/qualitygates/project_status') {
        response.setHeader('content-type', 'application/json')
        response.end(JSON.stringify({ projectStatus: { status: 'OK', conditions: [] } }))
        return
      }

      if (url.pathname === '/api/issues/search') {
        response.setHeader('content-type', 'application/json')
        response.end(
          JSON.stringify({
            total: 2,
            facets: [
              {
                property: 'issueStatuses',
                values: [
                  { val: 'OPEN', count: 1 },
                  { val: 'ACCEPTED', count: 1 },
                ],
              },
            ],
          }),
        )
        return
      }

      if (url.pathname === '/api/measures/component') {
        response.setHeader('content-type', 'application/json')
        response.end(
          JSON.stringify({
            component: {
              measures: [
                { metric: 'new_security_hotspots', periods: [{ index: 1, value: '0' }] },
                { metric: 'new_coverage', periods: [{ index: 1, value: '88.8' }] },
                { metric: 'new_duplicated_lines_density', periods: [{ index: 1, value: '0.5' }] },
              ],
            },
          }),
        )
        return
      }

      response.statusCode = 404
      response.end(JSON.stringify({ error: 'not found' }))
    })

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve())
    })

    const address = server.address()
    if (!address || typeof address === 'string') {
      throw new Error('Failed to get test server address')
    }
    baseUrl = `http://127.0.0.1:${address.port}`
  })

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }
        resolve()
      })
    })
  })

  it('returns PR report JSON', async () => {
    await runCli([
      'pr-report',
      '77',
      '--projectKey',
      'demo_project',
      '--token',
      'token',
      '--base-url',
      baseUrl,
      '--json',
    ])

    expect(stderrSpy()).not.toHaveBeenCalled()
    const output = String(stdoutSpy().mock.calls[0]?.[0])
    const parsed = JSON.parse(output)

    expect(parsed).toMatchObject({
      projectKey: 'demo_project',
      pullRequest: '77',
      qualityGateStatus: 'OK',
      failingQualityGateConditions: [],
      issueCounts: {
        newIssues: 1,
        acceptedIssues: 1,
      },
      measures: {
        securityHotspots: 0,
        coverageOnNewCode: 88.8,
        duplicationOnNewCode: 0.5,
      },
    })
  })
})
