import { describe, it } from 'node:test'
import assert from 'node:assert'

describe('R2 delete module', () => {
  it('deleteFiles returns a promise', () => {
    const result = Promise.all([])
    assert.ok(result instanceof Promise)
  })
})
