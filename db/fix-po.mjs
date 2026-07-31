import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();
const data = JSON.parse(fs.readFileSync('/home/z/my-project/db/sqlite-dump.json', 'utf-8'));
const rows = data['PurchaseOrder'] || [];
let count = 0;
for (const r of rows) {
  try {
    await prisma.purchaseOrder.create({
      data: {
        id: r.id,
        poNumber: r.poNumber,
        vendor: r.vendor,
        vendorId: r.vendorId,
        date: r.date ? new Date(r.date) : new Date(),
        expectedDelivery: r.expectedDelivery || null,
        items: r.items,
        totalAmount: r.totalAmount,
        priority: r.priority,
        status: r.status,
        notes: r.notes,
        terms: r.terms,
        approvedBy: r.approvedBy,
        approvedAt: r.approvedAt ? new Date(r.approvedAt) : null,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      }
    });
    count++;
  } catch(e) {}
}
console.log('PurchaseOrder: ' + count + ' rows');
await prisma.$disconnect();
