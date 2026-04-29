import { writeFile } from 'fs/promises'
import Papa from 'papaparse'
import type { PaperRef, Schema } from '@shared/types'

/**
 * Rebuild (overwrite) the CSV file at csvPath from the current in-memory refs.
 * Only columns marked inCsv: true in the schema are written.
 * Array values are joined with ';'.
 */
export async function rebuildCsv(
  csvPath: string,
  refs: PaperRef[],
  schema: Schema
): Promise<void> {
  const csvColumns = schema.columns
    .filter(col => col.inCsv)
    .map(col => col.name)

  const rows = refs.map(ref => {
    const row: Record<string, string> = {}
    for (const col of csvColumns) {
      const val = (ref as Record<string, unknown>)[col]
      if (Array.isArray(val)) {
        row[col] = val.join(';')
      } else if (val == null) {
        row[col] = ''
      } else {
        row[col] = String(val)
      }
    }
    return row
  })

  const csv = Papa.unparse(rows, { columns: csvColumns })
  await writeFile(csvPath, csv, 'utf-8')
}
