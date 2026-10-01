ALTER TABLE "Product"
ADD COLUMN "handle" TEXT,
ADD COLUMN "descriptionHtml" TEXT,
ADD COLUMN "shippingPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "shippingWeight" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "shippingWeightUnit" TEXT NOT NULL DEFAULT 'oz',
ADD COLUMN "packageSize" TEXT,
ADD COLUMN "mustShipAlone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "trackInventory" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "variantGroupName" TEXT NOT NULL DEFAULT 'Options',
ADD COLUMN "sourceUrl" TEXT;

ALTER TABLE "Order" ADD COLUMN "adminData" JSONB;
ALTER TABLE "Payment" ADD COLUMN "reference" TEXT, ADD COLUMN "notes" TEXT;
ALTER TABLE "CustomOrderRequest" ADD COLUMN "adminData" JSONB;

UPDATE "Product"
SET "handle" = LOWER(REGEXP_REPLACE(REGEXP_REPLACE("name", '[^A-Za-z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')) || '-' || SUBSTRING("id", 1, 8)
WHERE "handle" IS NULL;

ALTER TABLE "Product" ALTER COLUMN "handle" SET NOT NULL;
CREATE UNIQUE INDEX "Product_handle_key" ON "Product"("handle");

CREATE TABLE "AdminResource" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminResource_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "AdminAuditLog" (
  "id" TEXT NOT NULL,
  "adminEmail" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "resourceId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminAuditLog_adminEmail_createdAt_idx" ON "AdminAuditLog"("adminEmail", "createdAt");
CREATE INDEX "AdminAuditLog_resource_resourceId_idx" ON "AdminAuditLog"("resource", "resourceId");
