import Papa from 'papaparse'
import matter from 'gray-matter'
import type {
  PaperRef, PaperDetail, PaperId, Schema, CollectionInfo, Filter,
} from '@shared/types'
import type { WebS3 } from './s3client'

/**
 * Read-only library implementation for the web build. Fetches papers.csv
 * once on connect, parses it for the list view, and lazily fetches paper
 * markdown files for the detail view. Writes are not supported — the web
 * UI must surface this clearly to the user.
 */
export class WebLibrary {
  private refs: PaperRef[] = []
  private schemaCache: Schema | null = null
  private collections = new Map<string, Set<PaperId>>()

  constructor(public readonly s3: WebS3) {}

  async load(): Promise<void> {
    await this.loadSchema()
    await this.loadCsv()
    await this.loadCollections()
  }

  // ── Schema ────────────────────────────────────────────────────────────────

  private async loadSchema(): Promise<void> {
    try {
      const text = await this.s3.readText('schema.md')
      const parsed = matter(text)
      const data = parsed.data as { version?: number; columns?: Schema['columns'] }
      this.schemaCache = {
        version: data.version ?? 1,
        columns: data.columns ?? [],
      }
    } catch {
      this.schemaCache = { version: 1, columns: [] }
    }
  }

  schema(): Schema {
    return this.schemaCache ?? { version: 1, columns: [] }
  }

  // ── papers.csv → PaperRef[] ───────────────────────────────────────────────

  private async loadCsv(): Promise<void> {
    let text: string
    try {
      text = await this.s3.readText('papers.csv')
    } catch {
      this.refs = []
      return
    }
    const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true })
    const rows = parsed.data ?? []
    this.refs = rows.map((r) => csvRowToRef(r))
  }

  async list(filter?: Filter, collection?: string): Promise<PaperRef[]> {
    let out = this.refs.slice()
    if (collection) {
      const set = this.collections.get(collection)
      if (!set) return []
      out = out.filter((r) => set.has(r.id))
    }
    if (filter?.status?.length)  out = out.filter((r) => filter.status!.includes(r.status ?? 'unread'))
    if (filter?.tags?.length)    out = out.filter((r) => filter.tags!.every((t) => r.tags?.includes(t)))
    if (filter?.yearFrom != null) out = out.filter((r) => (r.year ?? 0) >= filter.yearFrom!)
    if (filter?.yearTo   != null) out = out.filter((r) => (r.year ?? 0) <= filter.yearTo!)
    return out
  }

  // ── Per-paper detail ──────────────────────────────────────────────────────

  async get(id: PaperId): Promise<PaperDetail> {
    const ref = this.refs.find((r) => r.id === id)
    if (!ref) throw new Error(`Paper "${id}" not found`)
    let markdown = ''
    try {
      const text = await this.s3.readText(`papers/${id}.md`)
      const parsed = matter(text)
      markdown = parsed.content
    } catch {
      // missing .md file — still return the ref data
    }
    return { ...ref, markdown }
  }

  async search(q: string): Promise<{ paper: PaperRef; score: number; terms: string[] }[]> {
    const lower = q.toLowerCase()
    return this.refs
      .filter((r) =>
        r.title.toLowerCase().includes(lower) ||
        r.authors.some((a) => a.toLowerCase().includes(lower)) ||
        r.tags?.some((t) => t.toLowerCase().includes(lower))
      )
      .map((paper) => ({ paper, score: 1, terms: [q] }))
  }

  // ── Collections (read-only) ───────────────────────────────────────────────

  private async loadCollections(): Promise<void> {
    try {
      const text = await this.s3.readText('collections.json')
      const data = JSON.parse(text) as Record<string, string[]>
      this.collections = new Map(Object.entries(data).map(([k, v]) => [k, new Set(v)]))
    } catch {
      this.collections = new Map()
    }
  }

  listCollections(): CollectionInfo[] {
    return [...this.collections.entries()].map(([name, set]) => ({
      name, paperCount: set.size,
    }))
  }

  // ── PDF URL ───────────────────────────────────────────────────────────────

  async pdfBytes(id: PaperId): Promise<Uint8Array | null> {
    try {
      return await this.s3.readBytes(`attachments/${id}.pdf`)
    } catch {
      return null
    }
  }
}

function csvRowToRef(row: Record<string, string>): PaperRef {
  const split = (v: string | undefined): string[] =>
    v ? v.split(';').map((s) => s.trim()).filter(Boolean) : []
  return {
    id:         row.id ?? '',
    title:      row.title ?? '',
    authors:    split(row.authors),
    year:       row.year ? Number(row.year) : undefined,
    venue:      row.venue || undefined,
    tags:       split(row.tags),
    status:     (row.status as PaperRef['status']) || 'unread',
    rating:     row.rating ? Number(row.rating) : undefined,
    added_at:   row.added_at || '',
    updated_at: row.updated_at || '',
    doi:        row.doi || undefined,
    url:        row.url || undefined,
    hasPdf:     row.hasPdf === 'true',
  }
}
