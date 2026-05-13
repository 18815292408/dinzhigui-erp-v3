import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getR2Client, getR2BucketName } from './client'

export async function deleteFile(path: string): Promise<void> {
  const client = getR2Client()
  const bucketName = getR2BucketName()

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: path,
  })

  await client.send(command)
}

export async function deleteFiles(paths: string[]): Promise<void> {
  await Promise.all(paths.map((path) => deleteFile(path)))
}
