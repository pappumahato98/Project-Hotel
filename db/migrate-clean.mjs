import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();
const data = JSON.parse(fs.readFileSync('/home/z/my-project/db/sqlite-dump.json', 'utf-8'));

// Tables in deletion order (reverse of creation)
const deleteOrder = [
  'activityLog','securityEvent','waitlistEntry','wakeUpCall','roomRatePosting',
  'bookingContact','guestDocument','roomMoveLog','channel','supportTicket',
  'asset','requisition','purchaseOrder','vendor','payroll','attendance',
  'journalEntryLine','journalEntry','ledgerAccount','workOrder','inventoryItem',
  'cashierShift','nightAudit','employee','event','hkWorkFlow','lostFound',
  'hkInspectionAudit','hkTask','orderItem','posOrder','menuItem','folioPayment',
  'folioTransaction','folio','reservation','dailyRate','roomRestriction',
  'room','ratePlan','guest','roomType','outlet','property','systemSetting','authUser'
];

// String fields that should NOT be converted to Date
const stringFields = {
  Attendance: ['checkIn','checkOut'],
  WakeUpCall: ['scheduledTime','date'],
  WaitlistEntry: ['checkInDate','checkOutDate'],
};

const allDateFields = ['createdAt','updatedAt','date','startDate','endDate','checkIn','checkOut',
  'scheduledTime','completedTime','completedAt','startedAt','businessDate','foundDate','claimDate',
  'hireDate','purchaseDate','warrantyExpiry','lastMaintenance','approvedAt','processedAt',
  'requestedDate','dueDate','resolvedAt','postedAt','lastSync','lastOrderDate','dateOfBirth',
  'lastStayAt','fromCheckIn','toCheckIn','fromCheckOut','calledAt','postingDate',
  'docExpiry','issueDate','lastLoginAt','expectedDelivery','reportDate'];

function fixRow(model, row) {
  const skip = stringFields[model] || [];
  const out = { ...row };
  for (const [k, v] of Object.entries(out)) {
    if (v && allDateFields.includes(k) && !skip.includes(k)) {
      out[k] = new Date(v);
    }
  }
  return out;
}

// Insertion order (respecting FK dependencies)
const insertOrder = [
  'Property','RoomType','Outlet','MenuItem','Guest','Employee','SystemSetting',
  'RatePlan','Room','DailyRate','RoomRestriction','Reservation','BookingContact','GuestDocument',
  'Folio','FolioTransaction','FolioPayment','PosOrder','OrderItem','HkTask',
  'HkInspectionAudit','LostFound','HkWorkFlow','Event','NightAudit','CashierShift',
  'InventoryItem','WorkOrder','LedgerAccount','JournalEntry','JournalEntryLine',
  'Attendance','Payroll','Vendor','PurchaseOrder','Requisition','Asset',
  'SupportTicket','RoomMoveLog','Channel','RoomRatePosting','ActivityLog',
  'SecurityEvent','WaitlistEntry','WakeUpCall','AuthUser'
];

async function main() {
  // Step 1: Delete all existing data
  console.log('=== Cleaning existing data ===');
  for (const model of deleteOrder) {
    try {
      const count = await prisma[model].count();
      if (count > 0) {
        await prisma[model].deleteMany();
        console.log('Deleted ' + count + ' from ' + model);
      }
    } catch(e) {
      console.log('Skip delete ' + model + ': ' + e.message.substring(0,100));
    }
  }

  // Step 2: Insert data
  console.log('\n=== Inserting fresh data ===');
  for (const model of insertOrder) {
    const rows = data[model];
    if (!rows || rows.length === 0) continue;
    try {
      const fixed = rows.map(r => fixRow(model, r));
      const result = await prisma[model].createMany({ data: fixed });
      console.log(model + ': ' + result.count + ' rows');
    } catch(e) {
      console.log(model + ' ERROR: ' + e.message.substring(0, 200));
    }
  }

  // Step 3: Verify
  console.log('\n=== Verification ===');
  for (const model of insertOrder) {
    try {
      const count = await prisma[model].count();
      console.log(model + ': ' + count);
    } catch(e) {}
  }

  await prisma.$disconnect();
  console.log('\nDone!');
}
main().catch(e => { console.error(e); process.exit(1); });
