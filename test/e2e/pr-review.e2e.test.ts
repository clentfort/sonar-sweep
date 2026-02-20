import { createServer } from 'node:http'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { runCli } from './support/run-cli.js'
import { setupCliProcess } from './support/setup-cli-process.js'

describe('pr-review e2e', () => {
  const { stdoutSpy, stderrSpy } = setupCliProcess()
  let server: ReturnType<typeof createServer>
  let baseUrl = ''

  beforeAll(async () => {
    server = createServer((request, response) => {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1')

      if (url.pathname === '/api/issues/search') {
        response.setHeader('content-type', 'application/json')
        response.end(
          JSON.stringify({
            total: 1,
            paging: { pageIndex: 1, pageSize: 20, total: 1 },
            issues: [
              {
                key: 'AZ-issue',
                rule: 'ts:S999',
                severity: 'MAJOR',
                component: 'demo_project:src/thing.ts',
                line: 3,
                status: 'OPEN',
                issueStatus: 'OPEN',
                message: 'Fix this issue.',
                type: 'BUG',
              },
            ],
            components: [
              {
                key: 'demo_project:src/thing.ts',
                path: 'src/thing.ts',
              },
            ],
            facets: [],
          }),
        )
        return
      }

      if (url.pathname === '/api/sources/raw') {
        response.setHeader('content-type', 'text/plain')
        response.end(['a', 'b', 'c', 'd'].join('\n'))
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

  it('returns issue review output as JSON', async () => {
    await runCli([
      'pr-review',
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

    expect(parsed.issues[0]).toMatchObject({
      key: 'AZ-issue',
      file: 'src/thing.ts',
      line: 3,
    })
    expect(parsed.issues[0].snippet.lines[2]).toMatchObject({ line: 3, text: 'c', highlight: true })
  })
})
