import type { IApi } from '@/lib/ipc'
import type { LibraryInfo, S3LibraryInfo, AgentConfig, AgentProfile } from '@shared/types'
import { PROVIDER_DEFINITIONS } from '@shared/providers'
import { createProvider } from '@shared/agent/providers'
import { WebS3, type S3Creds } from './s3client'
import { WebLibrary } from './webLibrary'
import { clearCreds, loadCreds, saveCreds } from './credentials'
import { hasApiKey, loadApiKey, saveApiKey } from './apiKeys'
import { WebAgent } from './webAgent'

/**
 * Web build adapter for IApi. Read-only — every write op resolves with a
 * "not supported" error so the UI surfaces the limitation. The single active
 * library is whatever S3 connection is stored in IndexedDB; there is no
 * concept of multi-library on the web.
 */

let lib: WebLibrary | null = null
let info: LibraryInfo | null = null

const switchedListeners = new Set<(info: LibraryInfo) => void>()

const ACTIVE_PROFILE_LS = 'verko:active-profile'

function getActiveProfileId(): string {
  return localStorage.getItem(ACTIVE_PROFILE_LS) || PROVIDER_DEFINITIONS[0].id
}

function setActiveProfileId(id: string): void {
  localStorage.setItem(ACTIVE_PROFILE_LS, id)
}

const agent = new WebAgent(
  () => lib,
  (providerId: string) => loadApiKey(providerId),
)

function notSupported(): Promise<never> {
  return Promise.reject(new Error('This action is only available in the desktop app.'))
}

function buildInfo(creds: S3Creds, paperCount: number): S3LibraryInfo {
  return {
    id: 'web-s3',
    name: creds.bucket,
    kind: 's3',
    endpoint: creds.endpoint,
    region: creds.region,
    bucket: creds.bucket,
    prefix: creds.prefix,
    active: true,
    paperCount,
  }
}

async function ensureLib(): Promise<WebLibrary | null> {
  if (lib) return lib
  const creds = await loadCreds()
  if (!creds) return null
  const s3 = new WebS3(creds)
  const l = new WebLibrary(s3)
  await l.load()
  lib = l
  info = buildInfo(creds, (await l.list()).length)
  return l
}

async function reload(creds: S3Creds): Promise<LibraryInfo> {
  const s3 = new WebS3(creds)
  await s3.ping()
  const l = new WebLibrary(s3)
  await l.load()
  await saveCreds(creds)
  lib = l
  info = buildInfo(creds, (await l.list()).length)
  for (const cb of switchedListeners) cb(info)
  return info
}

export const webApi: IApi = {
  libraries: {
    list: async () => {
      await ensureLib()
      return info ? [info] : []
    },
    open: async () => {
      const cur = info ?? (await ensureLib(), info)
      if (!cur) throw new Error('No active library')
      return cur
    },
    add: async (input) => {
      if (input.kind !== 's3') throw new Error('Web build only supports S3 libraries.')
      return reload({
        endpoint: input.endpoint,
        region: input.region,
        bucket: input.bucket,
        prefix: input.prefix,
        accessKeyId: input.accessKeyId,
        secretAccessKey: input.secretAccessKey,
        forcePathStyle: input.forcePathStyle,
      })
    },
    remove: async () => {
      await clearCreds()
      lib = null
      info = null
    },
    rename: notSupported,
    pickFolder: () => Promise.resolve(null),
    probeLocal: () => Promise.resolve({ status: 'error', message: 'Local libraries are desktop-only.' }),
    probeS3: async (cfg) => {
      try {
        const s3 = new WebS3(cfg)
        await s3.ping()
        const hasSchema = await s3.exists('schema.md')
        return { status: hasSchema ? 'ready' : 'uninitialized' }
      } catch (e) {
        return { status: 'error', message: e instanceof Error ? e.message : String(e) }
      }
    },
    hasNone: async () => {
      await ensureLib()
      return info == null
    },
    exportZip: () => Promise.resolve(null),
    importZip: () => Promise.resolve(null),
    onSwitched: (cb) => {
      switchedListeners.add(cb)
      return () => switchedListeners.delete(cb)
    },
    onNone: () => () => {},
  },

  collections: {
    list: async () => {
      const l = await ensureLib()
      return l?.listCollections() ?? []
    },
    create: notSupported, delete: notSupported, rename: notSupported,
    addPaper: notSupported, removePaper: notSupported,
  },

  papers: {
    list: async (filter, collection) => {
      const l = await ensureLib()
      return l ? l.list(filter, collection) : []
    },
    get: async (id) => {
      const l = await ensureLib()
      if (!l) throw new Error('No active library')
      return l.get(id)
    },
    add: notSupported, update: notSupported, delete: notSupported,
    search: async (q) => {
      const l = await ensureLib()
      return l ? l.search(q) : []
    },
    importDoi: notSupported, importPdf: notSupported,
  },

  schema: {
    get: async () => {
      const l = await ensureLib()
      return l?.schema() ?? { version: 1, columns: [] }
    },
    addColumn: notSupported, removeColumn: notSupported, renameColumn: notSupported,
  },

  agent: {
    send: async (message, attachments, paperId, language, conversationId) => {
      return agent.send(message, attachments, paperId, language, conversationId, getActiveProfileId())
    },
    abort: async (conversationId) => { agent.abort(conversationId) },
    getConfig: async (): Promise<AgentConfig> => ({
      defaultProfile: getActiveProfileId(),
      profiles: PROVIDER_DEFINITIONS.map((d) => ({
        name: d.id,
        protocol: d.protocol,
        baseUrl: d.defaults.baseUrl,
        model: d.defaults.model,
      })),
      maxTurns: 10,
      temperature: 0.3,
      showToolCalls: true,
    }),
    setProfile: async (id: string) => { setActiveProfileId(id) },
    updateProfile: async () => {
      // Models / baseUrls are catalog-driven in the web build.
    },
    saveKey: async (profile, key, remember) => { saveApiKey(profile, key, remember) },
    testKey: async (profile) => {
      const def = PROVIDER_DEFINITIONS.find((d) => d.id === profile)
      if (!def) return false
      const apiKey = loadApiKey(profile)
      if (!apiKey) return false
      try {
        const provider = createProvider({
          protocol: def.protocol,
          baseUrl: def.defaults.baseUrl,
          apiKey,
          model: def.defaults.model,
        })
        return await provider.testConnection()
      } catch {
        return false
      }
    },
    getProfiles: async (): Promise<AgentProfile[]> =>
      PROVIDER_DEFINITIONS.map((d) => ({
        name: d.id,
        protocol: d.protocol,
        baseUrl: d.defaults.baseUrl,
        model: d.defaults.model,
        hasKey: hasApiKey(d.id),
      })),
    onEvent: (cb) => agent.subscribe(cb),
  },

  conversations: {
    list:   async () => agent.listConversations(),
    get:    async (id: string) => agent.getConversation(id),
    create: async (title?: string) => agent.createConversation(title),
    rename: async (id: string, title: string) => agent.renameConversation(id, title),
    delete: async (id: string) => agent.deleteConversation(id),
  },

  pdf: {
    getPath: async (id) => {
      const l = await ensureLib()
      if (!l) return null
      const bytes = await l.pdfBytes(id)
      if (!bytes) return null
      const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })
      return URL.createObjectURL(blob)
    },
  },
}
