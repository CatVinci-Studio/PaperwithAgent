import { create } from 'zustand'
import type { LibraryInfo, PaperRef, Filter, Schema, CollectionInfo } from '@shared/types'
import { api } from '@/lib/ipc'

export type LibraryStatus = 'loading' | 'ready' | 'none'

interface LibraryStore {
  libraries: LibraryInfo[]
  activeLibrary: LibraryInfo | null
  status: LibraryStatus
  noneReason?: { reason: 'empty' | 'last-failed'; message?: string }
  papers: PaperRef[]
  schema: Schema | null
  collections: CollectionInfo[]
  activeCollection: string | null
  selectedId: string | null
  filter: Filter
  isLoadingPapers: boolean
  isLoadingLibraries: boolean

  setSelected: (id: string | null) => void
  setFilter: (f: Partial<Filter>) => void
  setStatus: (s: LibraryStatus, reason?: { reason: 'empty' | 'last-failed'; message?: string }) => void
  refreshPapers: () => Promise<void>
  refreshLibraries: () => Promise<void>
  refreshSchema: () => Promise<void>
  refreshCollections: () => Promise<void>
  refreshAll: () => Promise<void>
  switchLibrary: (id: string) => Promise<void>
  switchCollection: (name: string | null) => void
}

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  libraries: [],
  activeLibrary: null,
  status: 'loading',
  noneReason: undefined,
  papers: [],
  schema: null,
  collections: [],
  activeCollection: null,
  selectedId: null,
  filter: {},
  isLoadingPapers: false,
  isLoadingLibraries: false,

  setSelected: (id) => set({ selectedId: id }),

  setStatus: (s, reason) => set({ status: s, noneReason: reason }),

  setFilter: (f) => {
    set(state => ({ filter: { ...state.filter, ...f } }))
    get().refreshPapers()
  },

  refreshPapers: async () => {
    set({ isLoadingPapers: true })
    try {
      const papers = await api.papers.list(get().filter, get().activeCollection ?? undefined)
      set({ papers, isLoadingPapers: false })
    } catch {
      set({ isLoadingPapers: false })
    }
  },

  refreshLibraries: async () => {
    set({ isLoadingLibraries: true })
    try {
      const libraries = await api.libraries.list()
      const active = libraries.find(l => l.active) ?? null
      set({ libraries, activeLibrary: active, isLoadingLibraries: false })
    } catch {
      set({ isLoadingLibraries: false })
    }
  },

  refreshSchema: async () => {
    try {
      const schema = await api.schema.get()
      set({ schema })
    } catch {
      // ignore
    }
  },

  refreshCollections: async () => {
    try {
      const collections = await api.collections.list()
      set({ collections })
    } catch {
      // ignore
    }
  },

  switchCollection: (name) => {
    set({ activeCollection: name })
    get().refreshPapers()
  },

  refreshAll: async () => {
    await get().refreshLibraries()
    await get().refreshCollections()
    await get().refreshSchema()
    await get().refreshPapers()
  },

  switchLibrary: async (id) => {
    await api.libraries.open(id)
    set({ status: 'ready', noneReason: undefined, selectedId: null, activeCollection: null })
    await get().refreshAll()
  },
}))
