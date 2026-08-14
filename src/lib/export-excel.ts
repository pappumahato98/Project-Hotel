/**
 * Excel Export Utility with branded header styling.
 *
 * Table headers use #149DDD (brand blue) with white text,
 * matching the UI table header color across all modules.
 *
 * Uses dynamic import() to avoid bundling exceljs in the initial
 * client bundle — it only loads when the user clicks Export.
 *
 * Usage:
 *   exportToExcel(
 *     ['Name', 'Department', 'Salary'],
 *     [['John', 'Engineering', '5000'], ['Jane', 'Sales', '4500']],
 *     'employees'
 *   )
 */

const HEADER_BG = 'FF149DDD' // #149DDD in ARGB
const HEADER_FONT_COLOR = 'FFFFFFFF' // white
const BORDER_COLOR = 'FFCCCCCC'

interface ExportOptions {
  /** Sheet name (default: 'Sheet1') */
  sheetName?: string
  /** Column widths in characters (auto-calculated if not provided) */
  columnWidths?: number[]
  /** Footer rows to append (e.g., totals) — not styled as headers */
  footerRows?: (string | number | null)[][]
  /** Title row at the very top */
  title?: string
}

export async function exportToExcel(
  headers: string[],
  rows: (string | number | null | boolean | undefined)[][],
  filename: string,
  options: ExportOptions = {},
) {
  // Dynamic import — exceljs is large and uses Node.js APIs,
  // so we only load it when the user actually exports.
  const ExcelJS = await import('exceljs')

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(options.sheetName || 'Sheet1')

  let currentRow = 1

  // Optional title row
  if (options.title) {
    const titleRow = sheet.addRow([options.title])
    sheet.mergeCells(currentRow, 1, currentRow, headers.length)
    titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF333333' } }
    titleRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' }
    titleRow.height = 30
    currentRow++
  }

  // Header row
  const headerRow = sheet.addRow(headers)
  headerRow.height = 24
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: HEADER_BG },
    }
    cell.font = {
      bold: true,
      color: { argb: HEADER_FONT_COLOR },
      size: 11,
    }
    cell.alignment = { horizontal: 'left', vertical: 'middle' }
    cell.border = {
      bottom: { style: 'thin', color: { argb: HEADER_BG } },
      right: { style: 'thin', color: { argb: BORDER_COLOR } },
    }
  })

  // Data rows
  for (const row of rows) {
    const dataRow = sheet.addRow(row.map(v => v ?? ''))
    dataRow.height = 20
    dataRow.eachCell((cell) => {
      cell.font = { size: 10, color: { argb: 'FF333333' } }
      cell.alignment = { horizontal: 'left', vertical: 'middle' }
      cell.border = {
        bottom: { style: 'hair', color: { argb: BORDER_COLOR } },
        right: { style: 'hair', color: { argb: BORDER_COLOR } },
      }
    })
  }

  // Footer rows (e.g., totals)
  if (options.footerRows) {
    for (const footerRow of options.footerRows) {
      const row = sheet.addRow(footerRow.map(v => v ?? ''))
      row.height = 22
      row.eachCell((cell) => {
        cell.font = { bold: true, size: 10, color: { argb: 'FF333333' } }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF5F5F5' },
        }
        cell.border = {
          top: { style: 'thin', color: { argb: BORDER_COLOR } },
          bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
          right: { style: 'hair', color: { argb: BORDER_COLOR } },
        }
      })
    }
  }

  // Auto-fit column widths (or use provided widths)
  if (options.columnWidths) {
    options.columnWidths.forEach((w, i) => {
      sheet.getColumn(i + 1).width = w
    })
  } else {
    sheet.columns.forEach((col, i) => {
      const headerLen = (headers[i] || '').length
      const maxDataLen = rows.reduce((max, row) => {
        const val = String(row[i] ?? '')
        return Math.max(max, val.length)
      }, 0)
      col.width = Math.min(Math.max(headerLen, maxDataLen) + 4, 40)
    })
  }

  // Freeze header row
  sheet.views = [{ state: 'frozen', ySplit: currentRow }]

  // Download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
