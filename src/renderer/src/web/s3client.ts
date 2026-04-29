import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
  HeadBucketCommand,
} from '@aws-sdk/client-s3'

export interface S3Creds {
  endpoint?: string
  region: string
  bucket: string
  prefix?: string
  accessKeyId: string
  secretAccessKey: string
  forcePathStyle?: boolean
}

/**
 * Browser-side S3 reader. Uses @aws-sdk/client-s3, which is shipped as
 * an ES module in v3. CORS must be allowed on the bucket for the page's
 * origin — the AWS SDK signs requests with the user's keys directly.
 */
export class WebS3 {
  private client: S3Client
  constructor(public readonly cfg: S3Creds) {
    this.client = new S3Client({
      endpoint: cfg.endpoint,
      region: cfg.region,
      forcePathStyle: cfg.forcePathStyle ?? !!cfg.endpoint,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    })
  }

  private key(rel: string): string {
    const safe = rel.replace(/^[\\/]+/, '')
    if (!this.cfg.prefix) return safe
    return `${this.cfg.prefix.replace(/\/$/, '')}/${safe}`
  }

  async ping(): Promise<void> {
    await this.client.send(new HeadBucketCommand({ Bucket: this.cfg.bucket }))
  }

  async readBytes(rel: string): Promise<Uint8Array> {
    const out = await this.client.send(new GetObjectCommand({
      Bucket: this.cfg.bucket,
      Key: this.key(rel),
    }))
    const body = out.Body as { transformToByteArray?: () => Promise<Uint8Array> }
    if (!body?.transformToByteArray) throw new Error(`Empty body for ${rel}`)
    return body.transformToByteArray()
  }

  async readText(rel: string): Promise<string> {
    const bytes = await this.readBytes(rel)
    return new TextDecoder('utf-8').decode(bytes)
  }

  async listFiles(prefix = ''): Promise<string[]> {
    const fullPrefix = prefix ? this.key(prefix) : (this.cfg.prefix ? this.cfg.prefix.replace(/\/$/, '') + '/' : '')
    const out: string[] = []
    let token: string | undefined = undefined
    do {
      const res = await this.client.send(new ListObjectsV2Command({
        Bucket: this.cfg.bucket,
        Prefix: fullPrefix,
        ContinuationToken: token,
      }))
      for (const obj of res.Contents ?? []) {
        if (!obj.Key) continue
        const rel = this.cfg.prefix
          ? obj.Key.replace(new RegExp(`^${this.cfg.prefix.replace(/\/$/, '')}/`), '')
          : obj.Key
        out.push(rel)
      }
      token = res.IsTruncated ? res.NextContinuationToken : undefined
    } while (token)
    return out
  }

  async exists(rel: string): Promise<boolean> {
    try {
      await this.readBytes(rel)
      return true
    } catch {
      return false
    }
  }
}
