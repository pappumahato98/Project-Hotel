// ─── Shared Folio Statement HTML Generator ─────────────────────────────
// Used by both Print (client-side) and Email (server-side) features.

export interface FolioStatementData {
  // Hotel
  hotelName: string
  hotelAddress: string
  hotelPhone: string
  hotelEmail: string
  hotelWebsite: string
  printHeader: string
  printFooter: string
  starRating: number

  // Guest
  guestName: string
  guestEmail?: string | null
  guestPhone?: string | null
  vipLevel?: string

  // Reservation
  roomNumber: string
  confirmationNo: string
  checkIn: string
  checkOut: string
  roomRate: number

  // Folio
  folioType: string
  folioStatus: string
  folioId: string

  // Financial
  currency: string
  taxRate: number
  totalCharges: number
  totalPayments: number
  outstandingBalance: number

  // Transactions
  transactions: Array<{
    id: string
    transactionType: string
    description: string
    amount: number
    taxAmount: number
    totalAmount: number
    quantity: number
    reference: string | null
    outlet: string | null
    postedBy: string | null
    createdAt: string
  }>

  // Payments
  payments: Array<{
    id: string
    paymentMethod: string
    amount: number
    reference: string | null
    cardType: string | null
    receivedBy: string | null
    createdAt: string
  }>

  // Metadata
  generatedAt: string
  generatedBy?: string
}

function fmtCurrency(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function fmtDateTime(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return dateStr
  }
}

export function generateFolioStatementHtml(data: FolioStatementData): string {
  const stars = '★'.repeat(data.starRating || 0)

  const txnRows = data.transactions.map((t, i) => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #6b7280;">${i + 1}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">${t.description}${t.reference ? ` <span style="color:#9ca3af;font-size:11px;">Ref: ${t.reference}</span>` : ''}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: center;">${t.quantity > 1 ? t.quantity : '—'}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: right;">${fmtCurrency(t.amount, data.currency)}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: right;">${fmtCurrency(t.taxAmount, data.currency)}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: right; font-weight: 500;">${fmtCurrency(t.totalAmount, data.currency)}</td>
    </tr>
  `).join('')

  const payRows = data.payments.map((p, i) => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #6b7280;">${i + 1}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-transform: capitalize;">${p.paymentMethod}${p.cardType ? ` — ${p.cardType}` : ''}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #6b7280;">${p.reference || '—'}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: right; font-weight: 500; color: #059669;">${fmtCurrency(p.amount, data.currency)}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Folio Statement — ${data.guestName}</title>
  <style>
    @media print {
      body { margin: 0; padding: 0; }
      .page { box-shadow: none; margin: 0; padding: 40px; }
      .no-print { display: none !important; }
    }
    @page { margin: 15mm; size: A4; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background: #f3f4f6; }
    .page { max-width: 800px; margin: 0 auto; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 48px; border-radius: 2px; }
    .header { text-align: center; border-bottom: 3px solid #1f2937; padding-bottom: 20px; margin-bottom: 24px; }
    .header h1 { margin: 0 0 4px 0; font-size: 26px; font-weight: 700; color: #111827; letter-spacing: 2px; text-transform: uppercase; }
    .header .stars { color: #d97706; font-size: 14px; letter-spacing: 2px; }
    .header .tagline { margin: 6px 0 0 0; font-size: 12px; color: #6b7280; letter-spacing: 1px; }
    .header .contact { margin: 10px 0 0 0; font-size: 12px; color: #9ca3af; }
    table { width: 100%; border-collapse: collapse; }
    .section-title { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin: 24px 0 8px 0; padding-bottom: 6px; border-bottom: 2px solid #e5e7eb; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .info-card { background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 6px; padding: 14px 16px; }
    .info-card h3 { margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; font-weight: 600; }
    .info-card .value { font-size: 14px; color: #111827; font-weight: 500; margin: 2px 0; }
    .info-card .sub { font-size: 12px; color: #6b7280; }
    .totals-section { margin-top: 24px; display: flex; justify-content: flex-end; }
    .totals-box { width: 280px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
    .totals-row.total { border-top: 2px solid #1f2937; margin-top: 8px; padding-top: 12px; font-size: 16px; font-weight: 700; }
    .totals-row.total.due { color: #dc2626; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; }
    .footer p { margin: 4px 0; font-size: 11px; color: #9ca3af; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .badge-open { background: #dbeafe; color: #1d4ed8; }
    .badge-settled { background: #d1fae5; color: #065f46; }
    .badge-vip { background: #fef3c7; color: #92400e; margin-left: 6px; }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <h1>${data.hotelName}</h1>
      <div class="stars">${stars}</div>
      <p class="tagline">${data.printHeader}</p>
      <p class="contact">${data.hotelAddress} &nbsp;|&nbsp; ${data.hotelPhone} &nbsp;|&nbsp; ${data.hotelEmail}${data.hotelWebsite ? ` &nbsp;|&nbsp; ${data.hotelWebsite}` : ''}</p>
    </div>

    <!-- Title -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #111827;">Folio Statement</h2>
      <span class="badge badge-${data.folioStatus === 'open' ? 'open' : 'settled'}">${data.folioStatus}</span>
    </div>

    <!-- Guest & Stay Info -->
    <div class="info-grid">
      <div class="info-card">
        <h3>Guest Information</h3>
        <div class="value">${data.guestName}${data.vipLevel && data.vipLevel !== 'none' ? '<span class="badge badge-vip">VIP</span>' : ''}</div>
        ${data.guestEmail ? `<div class="sub">${data.guestEmail}</div>` : ''}
        ${data.guestPhone ? `<div class="sub">${data.guestPhone}</div>` : ''}
      </div>
      <div class="info-card">
        <h3>Stay Details</h3>
        <div class="value">Room ${data.roomNumber}</div>
        <div class="sub">${data.confirmationNo}</div>
        <div class="sub">${fmtDate(data.checkIn)} → ${fmtDate(data.checkOut)}</div>
        <div class="sub">${fmtCurrency(data.roomRate, data.currency)} / night</div>
      </div>
    </div>

    <!-- Charges Table -->
    ${data.transactions.length > 0 ? `
    <div class="section-title">Charges (${data.transactions.length})</div>
    <table>
      <thead>
        <tr style="background: #f9fafb;">
          <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600; border-bottom: 2px solid #e5e7eb;">#</th>
          <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Description</th>
          <th style="padding: 8px 12px; text-align: center; font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Qty</th>
          <th style="padding: 8px 12px; text-align: right; font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Amount</th>
          <th style="padding: 8px 12px; text-align: right; font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Tax</th>
          <th style="padding: 8px 12px; text-align: right; font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Total</th>
        </tr>
      </thead>
      <tbody>${txnRows}</tbody>
    </table>
    ` : '<div class="section-title">Charges</div><p style="color:#9ca3af;font-size:13px;padding:12px 0;">No charges posted to this folio.</p>'}

    <!-- Payments Table -->
    ${data.payments.length > 0 ? `
    <div class="section-title">Payments (${data.payments.length})</div>
    <table>
      <thead>
        <tr style="background: #f9fafb;">
          <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600; border-bottom: 2px solid #e5e7eb;">#</th>
          <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Method</th>
          <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Reference</th>
          <th style="padding: 8px 12px; text-align: right; font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Amount</th>
        </tr>
      </thead>
      <tbody>${payRows}</tbody>
    </table>
    ` : '<div class="section-title">Payments</div><p style="color:#9ca3af;font-size:13px;padding:12px 0;">No payments recorded.</p>'}

    <!-- Totals -->
    <div class="totals-section">
      <div class="totals-box">
        <div class="totals-row">
          <span style="color: #6b7280;">Total Charges</span>
          <span style="font-weight: 500;">${fmtCurrency(data.totalCharges, data.currency)}</span>
        </div>
        <div class="totals-row">
          <span style="color: #6b7280;">Total Payments</span>
          <span style="font-weight: 500; color: #059669;">− ${fmtCurrency(data.totalPayments, data.currency)}</span>
        </div>
        <div class="totals-row total ${data.outstandingBalance > 0 ? 'due' : ''}">
          <span>${data.outstandingBalance > 0 ? 'Balance Due' : 'Balance'}</span>
          <span>${fmtCurrency(data.outstandingBalance, data.currency)}</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>${data.printFooter}</p>
      <p>Statement generated on ${fmtDateTime(data.generatedAt)}${data.generatedBy ? ` by ${data.generatedBy}` : ''}</p>
      <p style="margin-top: 8px; font-size: 10px;">Folio ID: ${data.folioId} &nbsp;|&nbsp; ${data.folioType.charAt(0).toUpperCase() + data.folioType.slice(1)} Folio</p>
    </div>
  </div>
</body>
</html>`
}