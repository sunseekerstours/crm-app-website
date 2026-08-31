-- AlterTable quotes
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "dealId" TEXT;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "items" JSONB DEFAULT '[]';
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "tax" DECIMAL(12,2);
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "discount" DECIMAL(12,2);
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "terms" TEXT;

-- AlterTable invoices
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "dealId" TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "items" JSONB DEFAULT '[]';
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "tax" DECIMAL(12,2);
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "discount" DECIMAL(12,2);
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "terms" TEXT;

-- AlterTable payments
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "receiptNumber" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "dealId" TEXT;

-- Add foreign key constraints
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quotes_dealId_fkey') THEN
    ALTER TABLE "quotes" ADD CONSTRAINT "quotes_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_customerId_fkey') THEN
    ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_dealId_fkey') THEN
    ALTER TABLE "invoices" ADD CONSTRAINT "invoices_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_customerId_fkey') THEN
    ALTER TABLE "payments" ADD CONSTRAINT "payments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_dealId_fkey') THEN
    ALTER TABLE "payments" ADD CONSTRAINT "payments_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "quotes_dealId_idx" ON "quotes"("dealId");
CREATE INDEX IF NOT EXISTS "invoices_customerId_idx" ON "invoices"("customerId");
CREATE INDEX IF NOT EXISTS "invoices_dealId_idx" ON "invoices"("dealId");
CREATE INDEX IF NOT EXISTS "payments_customerId_idx" ON "payments"("customerId");
CREATE INDEX IF NOT EXISTS "payments_dealId_idx" ON "payments"("dealId");
