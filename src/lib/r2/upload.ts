import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getR2Client, getR2BucketName, getR2PublicUrl } from './client'

const UPLOAD_URL_EXPIRES_IN = 3600 // 1小时

export interface UploadUrlResult {
  signedUrl: string
  publicUrl: string
  path: string
}

export async function generateUploadUrl(path: string): Promise<UploadUrlResult> {
  const client = getR2Client()
  const bucketName = getR2BucketName()

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: path,
  })

  const signedUrl = await getSignedUrl(client, command, {
    expiresIn: UPLOAD_URL_EXPIRES_IN,
  })

  const publicUrl = getR2PublicUrl()
    ? `${getR2PublicUrl()}/${path}`
    : `${client.config.endpoint}/public/${bucketName}/${path}`

  return {
    signedUrl,
    publicUrl,
    path,
  }
}

export async function uploadFile(
  buffer: Buffer,
  path: string,
  contentType?: string
): Promise<{ publicUrl: string; path: string }> {
  const client = getR2Client()
  const bucketName = getR2BucketName()

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: path,
    Body: buffer,
    ContentType: contentType || 'application/octet-stream',
  })

  await client.send(command)

  const publicUrl = getR2PublicUrl()
    ? `${getR2PublicUrl()}/${path}`
    : `https://${bucketName}.r2.dev/${path}`

  return {
    publicUrl,
    path,
  }
}

export function getPublicUrl(path: string): string {
  const publicUrl = getR2PublicUrl()
  if (publicUrl) {
    return `${publicUrl}/${path}`
  }
  return `https://${getR2BucketName()}.r2.dev/${path}`
}
