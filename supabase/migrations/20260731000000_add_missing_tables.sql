-- Migration: Add 14 missing tables + missing columns
-- Date: 2025-07-31
-- 
-- Tables added:
--   RefreshToken, PasswordReset, AccountingPeriod, Reconciliation,
--   LeaveRequest, PerformanceReview, TrainingSession, TrainingEnrollment,
--   ShiftExchange, JobPosting, JobApplication, Budget, Invoice, InvoiceLineItem
--
-- Columns added:
--   AuthUser.passwordHash (critical for auth — was missing from init migration)
--   LedgerAccount.subtype (needed by accounting module)

-- ─── 0. Add missing columns to existing tables ───
ALTER TABLE "AuthUser" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "LedgerAccount" ADD COLUMN IF NOT EXISTS "subtype" TEXT;

-- ─── 2. RefreshToken ───
CREATE TABLE IF NOT EXISTS "RefreshToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE INDEX IF NOT EXISTS "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "AuthUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── 3. PasswordReset ───
CREATE TABLE IF NOT EXISTS "PasswordReset" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PasswordReset_tokenHash_key" ON "PasswordReset"("tokenHash");
CREATE INDEX IF NOT EXISTS "PasswordReset_userId_idx" ON "PasswordReset"("userId");
CREATE INDEX IF NOT EXISTS "PasswordReset_expiresAt_idx" ON "PasswordReset"("expiresAt");

ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "AuthUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── 4. AccountingPeriod ───
CREATE TABLE IF NOT EXISTS "AccountingPeriod" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodType" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "closedBy" TEXT,
    "closedAt" TIMESTAMP(3),
    "openingTrialBalance" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "AccountingPeriod_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AccountingPeriod_period_key" ON "AccountingPeriod"("period");
CREATE INDEX IF NOT EXISTS "AccountingPeriod_status_idx" ON "AccountingPeriod"("status");

-- ─── 5. Reconciliation ───
CREATE TABLE IF NOT EXISTS "Reconciliation" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accountName" TEXT,
    "accountCode" TEXT,
    "bankName" TEXT,
    "statementDate" TIMESTAMP(3),
    "statementBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bookBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "difference" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reconciledBy" TEXT,
    "reconciledAt" TIMESTAMP(3),
    "adjustments" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "Reconciliation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Reconciliation_accountId_idx" ON "Reconciliation"("accountId");
CREATE INDEX IF NOT EXISTS "Reconciliation_status_idx" ON "Reconciliation"("status");

-- ─── 6. LeaveRequest ───
CREATE TABLE IF NOT EXISTS "LeaveRequest" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "leaveType" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "reason" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LeaveRequest_status_idx" ON "LeaveRequest"("status");
CREATE INDEX IF NOT EXISTS "LeaveRequest_employeeId_idx" ON "LeaveRequest"("employeeId");
CREATE INDEX IF NOT EXISTS "LeaveRequest_department_idx" ON "LeaveRequest"("department");
CREATE INDEX IF NOT EXISTS "LeaveRequest_startDate_idx" ON "LeaveRequest"("startDate");

-- ─── 7. PerformanceReview ───
CREATE TABLE IF NOT EXISTS "PerformanceReview" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "reviewPeriod" TEXT NOT NULL,
    "reviewDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewerName" TEXT NOT NULL,
    "reviewerId" TEXT,
    "attendanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taskScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "guestSatScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "punctualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overallScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "strengths" TEXT,
    "improvements" TEXT,
    "goals" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "PerformanceReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PerformanceReview_employeeId_idx" ON "PerformanceReview"("employeeId");
CREATE INDEX IF NOT EXISTS "PerformanceReview_department_idx" ON "PerformanceReview"("department");
CREATE INDEX IF NOT EXISTS "PerformanceReview_reviewPeriod_idx" ON "PerformanceReview"("reviewPeriod");
CREATE INDEX IF NOT EXISTS "PerformanceReview_status_idx" ON "PerformanceReview"("status");

-- ─── 8. TrainingSession ───
CREATE TABLE IF NOT EXISTS "TrainingSession" (
    "id" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "instructor" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "duration" TEXT NOT NULL,
    "enrolled" INTEGER NOT NULL DEFAULT 0,
    "maxCapacity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Upcoming',
    "category" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "department" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "TrainingSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TrainingSession_status_idx" ON "TrainingSession"("status");
CREATE INDEX IF NOT EXISTS "TrainingSession_category_idx" ON "TrainingSession"("category");
CREATE INDEX IF NOT EXISTS "TrainingSession_date_idx" ON "TrainingSession"("date");

-- ─── 9. TrainingEnrollment ───
CREATE TABLE IF NOT EXISTS "TrainingEnrollment" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Enrolled',
    "score" DOUBLE PRECISION,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "TrainingEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TrainingEnrollment_sessionId_idx" ON "TrainingEnrollment"("sessionId");
CREATE INDEX IF NOT EXISTS "TrainingEnrollment_employeeId_idx" ON "TrainingEnrollment"("employeeId");

-- ─── 10. ShiftExchange ───
CREATE TABLE IF NOT EXISTS "ShiftExchange" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "requesterDept" TEXT NOT NULL,
    "fromShift" TEXT NOT NULL,
    "toShift" TEXT NOT NULL,
    "targetId" TEXT,
    "targetName" TEXT,
    "exchangeDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "ShiftExchange_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ShiftExchange_status_idx" ON "ShiftExchange"("status");
CREATE INDEX IF NOT EXISTS "ShiftExchange_requesterId_idx" ON "ShiftExchange"("requesterId");
CREATE INDEX IF NOT EXISTS "ShiftExchange_requesterDept_idx" ON "ShiftExchange"("requesterDept");
CREATE INDEX IF NOT EXISTS "ShiftExchange_exchangeDate_idx" ON "ShiftExchange"("exchangeDate");

-- ─── 11. JobPosting ───
CREATE TABLE IF NOT EXISTS "JobPosting" (
    "id" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "employmentType" TEXT NOT NULL DEFAULT 'Full-time',
    "description" TEXT,
    "requirements" TEXT,
    "salaryMin" DOUBLE PRECISION,
    "salaryMax" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "postedBy" TEXT,
    "postedAt" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "appliedCount" INTEGER NOT NULL DEFAULT 0,
    "screeningCount" INTEGER NOT NULL DEFAULT 0,
    "interviewCount" INTEGER NOT NULL DEFAULT 0,
    "offerCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "JobPosting_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "JobPosting_status_idx" ON "JobPosting"("status");
CREATE INDEX IF NOT EXISTS "JobPosting_department_idx" ON "JobPosting"("department");

-- ─── 12. JobApplication ───
CREATE TABLE IF NOT EXISTS "JobApplication" (
    "id" TEXT NOT NULL,
    "postingId" TEXT NOT NULL,
    "applicantName" TEXT NOT NULL,
    "applicantEmail" TEXT,
    "applicantPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Applied',
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "resumeUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "JobApplication_postingId_idx" ON "JobApplication"("postingId");
CREATE INDEX IF NOT EXISTS "JobApplication_status_idx" ON "JobApplication"("status");

-- ─── 13. Budget ───
CREATE TABLE IF NOT EXISTS "Budget" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "accountId" TEXT,
    "accountName" TEXT,
    "accountCode" TEXT,
    "department" TEXT,
    "budgetedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Budget_fiscalYear_idx" ON "Budget"("fiscalYear");
CREATE INDEX IF NOT EXISTS "Budget_department_idx" ON "Budget"("department");
CREATE INDEX IF NOT EXISTS "Budget_status_idx" ON "Budget"("status");

-- ─── 14. Invoice ───
CREATE TABLE IF NOT EXISTS "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'sales',
    "vendorName" TEXT,
    "customerName" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE INDEX IF NOT EXISTS "Invoice_status_idx" ON "Invoice"("status");
CREATE INDEX IF NOT EXISTS "Invoice_type_idx" ON "Invoice"("type");
CREATE INDEX IF NOT EXISTS "Invoice_date_idx" ON "Invoice"("date");

-- ─── 15. InvoiceLineItem ───
CREATE TABLE IF NOT EXISTS "InvoiceLineItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 13,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "InvoiceLineItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InvoiceLineItem_invoiceId_idx" ON "InvoiceLineItem"("invoiceId");

ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
