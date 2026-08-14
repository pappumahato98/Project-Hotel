// ─── Table Sorting Utility ────────────────────────────────────────

export interface SortConfig {
  field: string
  direction: 'asc' | 'desc'
}

export function handleSort(
  currentField: string,
  currentDirection: 'asc' | 'desc',
  newField: string,
): SortConfig {
  if (currentField === newField) {
    return { field: newField, direction: currentDirection === 'asc' ? 'desc' : 'asc' }
  }
  return { field: newField, direction: 'asc' }
}

// ─── CSV Export Utility ───────────────────────────────────────────
// DEPRECATED: Use `exportToExcel` from `@/lib/export-excel` instead for Excel
// output with #149DDD branded header styling. This function is kept for
// backward compatibility but produces plain CSV files.

export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data || data.length === 0) return

  const flattenRow = (row: Record<string, unknown>, prefix = ''): Record<string, unknown> => {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(row)) {
      const fullKey = prefix ? `${prefix}.${key}` : key
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(result, flattenRow(value as Record<string, unknown>, fullKey))
      } else if (Array.isArray(value)) {
        result[fullKey] = JSON.stringify(value)
      } else {
        result[fullKey] = value
      }
    }
    return result
  }

  const flattened = data.map((row) => flattenRow(row))
  const headers = Object.keys(flattened[0] || {})
  const csvRows: string[] = []
  csvRows.push(headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','))
  for (const row of flattened) {
    const values = headers.map((h) => {
      const val = row[h]
      if (val === null || val === undefined) return ''
      return `"${String(val).replace(/"/g, '""')}"`
    })
    csvRows.push(values.join(','))
  }

  const csvContent = '\uFEFF' + csvRows.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
