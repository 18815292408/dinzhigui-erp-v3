import { describe, it } from 'node:test'
import assert from 'node:assert'

describe('R2 client env logic', () => {
  it('returns default bucket name when env is not set', () => {
    delete process.env.R2_BUCKET_NAME
    const bucketName = process.env.R2_BUCKET_NAME || 'cad-files'
    assert.strictEqual(bucketName, 'cad-files')
  })

  it('returns custom bucket name from env', () => {
    process.env.R2_BUCKET_NAME = 'my-bucket'
    const bucketName = process.env.R2_BUCKET_NAME || 'cad-files'
    assert.strictEqual(bucketName, 'my-bucket')
    delete process.env.R2_BUCKET_NAME
  })

  it('returns undefined when public url env is not set', () => {
    delete process.env.R2_PUBLIC_URL
    const publicUrl = process.env.R2_PUBLIC_URL
    assert.strictEqual(publicUrl, undefined)
  })

  it('returns custom public url from env', () => {
    process.env.R2_PUBLIC_URL = 'https://cdn.example.com'
    const publicUrl = process.env.R2_PUBLIC_URL
    assert.strictEqual(publicUrl, 'https://cdn.example.com')
    delete process.env.R2_PUBLIC_URL
  })
})
