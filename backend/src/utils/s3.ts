import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { env } from '../config/env'

const s3 = new S3Client({
  region: env.aws.region,
})

export async function uploadToS3(
  buffer: Buffer,
  mimetype: string,
  folder: string,
): Promise<string> {
  const ext = mimetype.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'
  const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  await s3.send(
    new PutObjectCommand({
      Bucket: env.aws.s3Bucket,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    }),
  )

  return `https://${env.aws.s3Bucket}.s3.${env.aws.region}.amazonaws.com/${key}`
}
