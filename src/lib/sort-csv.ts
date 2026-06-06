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

export function sortData<T>(data: T[], config: SortConfig): T[] {
  if (!config.field) return data
  const { field, direction } = config
  return [...data].sort((a, b) => {
    const getVal = (obj: T, path: string): unknown => {
      return path.split('.').reduce((acc: unknown, key: string) => {
        if (acc && typeof acc === 'object') {
          return (acc as Record<string, unknown>)[key]
        }
        return undefined
      }, obj)
    }
    const aFinal = getVal(a, field)
    const bFinal = getVal(b, field)

    if (aFinal == null && bFinal == null) return 0
    if (aFinal == null) return direction === 'asc' ? 1 : -1
    if (bFinal == null) return direction === 'asc' ? -1 : 1

    if (typeof aFinal === 'number' && typeof bFinal === 'number') {
      return direction === 'asc' ? aFinal - bFinal : bFinal - aFinal
    }
    const aStr = String(aFinal).toLowerCase()
    const bStr = String(bFinal).toLowerCase()
    return direction === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
  })
}

// ─── CSV Export Utility ───────────────────────────────────────────

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
