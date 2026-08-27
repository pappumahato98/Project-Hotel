// ─── Print Utility for Hotel PMS ──────────────────────────────────────

interface PrintReceiptData {
  hotelName: string
  title: string
  guestName: string
  roomNumber: string
  roomType?: string
  checkIn?: string
  checkOut?: string
  confirmationNo?: string
  currency: string
  charges: { description: string; amount: number; type: 'charge' | 'payment' }[]
  totalCharges: number
  totalPayments: number
  balance: number
  date: string
}

export function openPrintDialog(data: PrintReceiptData) {
  const printWindow = window.open('', '_blank', 'width=400,height=600')
  if (!printWindow) {
    alert('Please allow pop-ups to print receipts')
    return
  }

  const { hotelName, title, guestName, roomNumber, roomType, checkIn, checkOut, confirmationNo, currency, charges, totalCharges, totalPayments, balance, date } = data

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${title} - ${hotelName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      width: 300px;
      margin: 0 auto;
      padding: 20px 10px;
      color: #000;
    }
    .header { text-align: center; margin-bottom: 16px; border-bottom: 2px dashed #000; padding-bottom: 12px; }
    .hotel-name { font-size: 18px; font-weight: bold; letter-spacing: 2px; }
    .title { font-size: 14px; margin-top: 4px; }
    .date { font-size: 10px; color: #555; margin-top: 4px; }
    .info { margin-bottom: 12px; }
    .info-row { display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px dotted #ccc; }
    .info-label { color: #555; }
    .info-value { font-weight: bold; }
    .items { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 8px 0; margin: 8px 0; }
    .item-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 11px; }
    .item-desc { max-width: 180px; }
    .charge { color: #000; }
    .payment { color: #16a34a; }
    .totals { margin-top: 8px; }
    .total-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px; }
    .balance-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 16px; font-weight: bold; border-top: 2px double #000; margin-top: 4px; }
    .balance-negative { color: #dc2626; }
    .balance-positive { color: #16a34a; }
    .footer { text-align: center; margin-top: 16px; padding-top: 12px; border-top: 1px dashed #000; font-size: 10px; color: #555; }
    .divider { text-align: center; margin: 8px 0; color: #aaa; }
    @media print {
      body { width: 80mm; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="hotel-name">${hotelName}</div>
    <div class="title">${title}</div>
    <div class="date">${date}</div>
  </div>

  <div class="info">
    <div class="info-row"><span class="info-label">Guest:</span><span class="info-value">${guestName}</span></div>
    <div class="info-row"><span class="info-label">Room:</span><span class="info-value">${roomNumber}${roomType ? ` (${roomType})` : ''}</span></div>
    ${checkIn ? `<div class="info-row"><span class="info-label">Check-in:</span><span class="info-value">${checkIn}</span></div>` : ''}
    ${checkOut ? `<div class="info-row"><span class="info-label">Check-out:</span><span class="info-value">${checkOut}</span></div>` : ''}
    ${confirmationNo ? `<div class="info-row"><span class="info-label">Conf#:</span><span class="info-value">${confirmationNo}</span></div>` : ''}
  </div>

  <div class="items">
    ${charges.map(c => `
      <div class="item-row">
        <span class="item-desc">${c.description}</span>
        <span class="${c.type === 'charge' ? 'charge' : 'payment'}">${c.type === 'charge' ? '' : '-'}${currency} ${c.amount.toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
    `).join('')}
  </div>

  <div class="totals">
    <div class="total-row"><span>Total Charges:</span><span>${currency} ${totalCharges.toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
    <div class="total-row"><span>Total Payments:</span><span>-${currency} ${totalPayments.toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
    <div class="balance-row"><span>BALANCE:</span><span class="${balance > 0 ? 'balance-negative' : 'balance-positive'}">${currency} ${balance.toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
  </div>

  <div class="footer">
    <p>Thank you for staying with us!</p>
    <p>${hotelName} — Where Comfort Meets Luxury</p>
  </div>

  <div class="divider">- - - - - - - - - - - - - -</div>

  <div class="no-print" style="text-align:center; margin-top:12px;">
    <button onclick="window.print()" style="padding:8px 24px; font-size:14px; cursor:pointer; border:2px solid #000; background:#f5f5f5; border-radius:4px;">
      🖨️ Print Receipt
    </button>
  </div>

  <script>
    // Auto-trigger print dialog
    setTimeout(() => { window.print(); }, 500);
  </script>
</body>
</html>`)

  printWindow.document.close()
}

export function buildReceiptCharges(
  dep: {
    totalAmount: number
    paidAmount: number
    room: { number: string; type: { name: string; bedConfig?: string } }
    guest: { firstName: string; lastName: string }
    confirmationNo: string
    checkIn: string
    checkOut: string
    folios: { balance: number; items?: { description: string; amount: number; type: 'charge' | 'payment' }[] }[]
    adults?: number
    children?: number
  },
  formatCurrencyFn: (n: number) => string,
  formatDateFn: (d: string) => string,
  formatTimeFn: (d: string) => string,
  getRoomTypeBedShortFn: (name?: string, bed?: string) => string,
) {
  const pax = (dep.adults ?? 1) + (dep.children ?? 0)
  const roomLabel = `${dep.room.number} (${getRoomTypeBedShortFn(dep.room.type?.name, dep.room.type?.bedConfig)}${pax > 1 ? ` +${pax}` : ''})`
  const charges: { description: string; amount: number; type: 'charge' | 'payment' }[] = []
  charges.push({ description: `Room Charge (${roomLabel})`, amount: dep.totalAmount, type: 'charge' })
  if (dep.paidAmount > 0) {
    charges.push({ description: 'Advance Payment', amount: dep.paidAmount, type: 'payment' })
  }
  ;(dep.folios[0]?.items || []).forEach((item) => {
    charges.push({ description: item.description, amount: item.amount, type: item.type })
  })
  const totalCharges = charges.filter(c => c.type === 'charge').reduce((s, c) => s + c.amount, 0)
  const totalPayments = charges.filter(c => c.type === 'payment').reduce((s, c) => s + c.amount, 0)
  const balance = dep.folios[0]?.balance ?? (totalCharges - totalPayments)
  return { charges, totalCharges, totalPayments, balance }
}
