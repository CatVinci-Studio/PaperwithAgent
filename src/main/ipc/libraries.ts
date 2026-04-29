import { dialog } from 'electron'
import type { IpcMain, BrowserWindow } from 'electron'
import { stat } from 'fs/promises'
import { join } from 'path'
import type { LibraryManager } from '../paperdb/manager'
import { S3Backend } from '../paperdb/backendS3'
import { BackendAuthError, BackendNetworkError } from '../paperdb/backend'
import type { NewLibraryInput, NewS3LibraryInput, ProbeResult } from '@shared/types'

export function registerLibraryHandlers(
  ipc: IpcMain,
  manager: LibraryManager,
  getWindow: () => BrowserWindow | null,
): void {
  ipc.handle('libraries:list', async () => {
    return manager.list()
  })

  ipc.handle('libraries:hasNone', async () => {
    return !manager.hasActive()
  })

  ipc.handle('libraries:open', async (_, id: string) => {
    try {
      const info = await manager.open(id)
      getWindow()?.webContents.send('library:switched', info)
      return info
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : String(e))
    }
  })

  ipc.handle('libraries:add', async (_, input: NewLibraryInput) => {
    try {
      const info = await manager.add(input)
      getWindow()?.webContents.send('library:switched', info)
      return info
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : String(e))
    }
  })

  ipc.handle('libraries:remove', async (_, id: string) => {
    try {
      await manager.remove(id)
      if (!manager.hasActive()) {
        getWindow()?.webContents.send('library:none', { reason: 'empty' })
      }
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : String(e))
    }
  })

  ipc.handle('libraries:rename', async (_, id: string, newName: string) => {
    try {
      await manager.rename(id, newName)
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : String(e))
    }
  })

  ipc.handle('libraries:pickFolder', async () => {
    const win = getWindow()
    const res = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory', 'createDirectory'],
    })
    return res.canceled || res.filePaths.length === 0 ? null : res.filePaths[0]
  })

  ipc.handle('libraries:probeLocal', async (_, path: string): Promise<ProbeResult> => {
    try {
      const st = await stat(path)
      if (!st.isDirectory()) {
        return { status: 'error', message: 'Path is not a folder' }
      }
    } catch {
      return { status: 'error', message: 'Folder does not exist' }
    }
    try {
      await stat(join(path, 'schema.md'))
      return { status: 'ready' }
    } catch {
      return { status: 'uninitialized' }
    }
  })

  ipc.handle(
    'libraries:probeS3',
    async (_, cfg: Omit<NewS3LibraryInput, 'kind' | 'name' | 'initialize'>): Promise<ProbeResult> => {
      try {
        const be = new S3Backend({
          endpoint: cfg.endpoint,
          region: cfg.region,
          bucket: cfg.bucket,
          prefix: cfg.prefix,
          forcePathStyle: cfg.forcePathStyle,
          accessKeyId: cfg.accessKeyId,
          secretAccessKey: cfg.secretAccessKey,
        })
        await be.probe()
        const hasSchema = await be.exists('schema.md')
        return { status: hasSchema ? 'ready' : 'uninitialized' }
      } catch (e) {
        if (e instanceof BackendAuthError) {
          return { status: 'error', message: 'Auth failed — check access key and secret' }
        }
        if (e instanceof BackendNetworkError) {
          return { status: 'error', message: 'Network error — check endpoint and connection' }
        }
        return { status: 'error', message: e instanceof Error ? e.message : String(e) }
      }
    },
  )
}
