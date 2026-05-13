import { S3Client } from '@aws-sdk/client-s3'

let s3Client: S3Client | null = null

export function getR2Client(): S3Client {
  if (s3Client) {
    return s3Client
  }

  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'R2 环境变量未配置。请检查 R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY'
    )
  }

  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })

  return s3Client
}

export function getR2BucketName(): string {
  return process.env.R2_BUCKET_NAME || 'quanwudinzhierp'
}

export function getR2PublicUrl(): string | undefined {
  return process.env.R2_PUBLIC_URL
}
