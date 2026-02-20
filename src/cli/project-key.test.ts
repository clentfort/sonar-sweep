import { describe, expect, it } from 'vitest'

import { resolveProjectKey } from './project-key.js'

describe('resolveProjectKey', () => {
  it('returns explicitly provided project key', () => {
    expect(resolveProjectKey('my_project')).toBe('my_project')
  })
})
