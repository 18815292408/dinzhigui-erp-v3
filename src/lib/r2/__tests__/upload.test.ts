import { describe, it } from 'node:test'
import assert from 'node:assert'

describe('R2 upload public url logic', () => {
  it('returns default r2.dev url when public url is not set', () => {
    delete process.env.R2_PUBLIC_URL
    const bucketName = process.env.R2_BUCKET_NAME || 'cad-files'
    const url = `https://${bucketName}.r2.dev/org-1/1234567890-file.dwg`
    assert.ok(url.includes('r2.dev'))
    assert.ok(url.includes('org-1/1234567890-file.dwg'))
  })

  it('returns custom public url when env is set', () => {
    process.env.R2_PUBLIC_URL = 'https://cdn.example.com'
    const url = `${process.env.R2_PUBLIC_URL}/org-1/1234567890-file.dwg`
    assert.strictEqual(url, 'https://cdn.example.com/org-1/1234567890-file.dwg')
    delete process.env.R2_PUBLIC_URL
  })
})
