import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getR2Client, getR2BucketName } from './client'

const DOWNLOAD_URL_EXPIRES_IN = 3600 // 1小时

export async function generateDownloadUrl(path: string): Promise<string> {
  const client = getR2Client()
  const bucketName = getR2BucketName()

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: path,
  })

  const signedUrl = await getSignedUrl(client, command, {
    expiresIn: DOWNLOAD_URL_EXPIRES_IN,
  })

  return signedUrl
}
