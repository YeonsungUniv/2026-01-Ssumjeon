import { S3Client, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3'
import { env } from '../config/env'

const s3 = new S3Client({ region: env.aws.region })

const BUCKET = env.aws.s3Bucket
const BASE_URL = `https://${BUCKET}.s3.${env.aws.region}.amazonaws.com/`

export async function uploadToS3(buffer: Buffer, mimetype: string, folder: string): Promise<string> {
  const ext = mimetype.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'
  const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
  }))

  return `${BASE_URL}${key}`
}

// URL에서 S3 Key 추출
function urlToKey(url: string): string | null {
  if (!url.startsWith(BASE_URL)) return null
  return url.slice(BASE_URL.length)
}

// 단일 S3 파일 삭제
export async function deleteFromS3(url: string): Promise<void> {
  const key = urlToKey(url)
  if (!key) return
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
  } catch (err) {
    console.warn('[S3] delete failed:', key, err)
  }
}

// 복수 S3 파일 삭제 (최대 1000개)
export async function deleteMultipleFromS3(urls: string[]): Promise<void> {
  const keys = urls.map(urlToKey).filter((k): k is string => k !== null)
  if (keys.length === 0) return
  try {
    await s3.send(new DeleteObjectsCommand({
      Bucket: BUCKET,
      Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
    }))
  } catch (err) {
    console.warn('[S3] batch delete failed:', err)
  }
}
