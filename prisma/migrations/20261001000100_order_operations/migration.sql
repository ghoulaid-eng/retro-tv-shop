ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'SHIPPED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';

ALTER TABLE "Order"
ADD COLUMN "fulfillmentStatus" TEXT NOT NULL DEFAULT 'UNFULFILLED',
ADD COLUMN "trackingCarrier" TEXT,
ADD COLUMN "trackingNumber" TEXT,
ADD COLUMN "trackingUrl" TEXT,
ADD COLUMN "shippedAt" TIMESTAMP(3),
ADD COLUMN "deliveredAt" TIMESTAMP(3),
ADD COLUMN "canceledAt" TIMESTAMP(3),
ADD COLUMN "refundedAt" TIMESTAMP(3),
ADD COLUMN "cancellationReason" TEXT;

ALTER TABLE "Payment"
ADD COLUMN "refundAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "providerRefundId" TEXT,
ADD COLUMN "refundPending" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "Payment_providerRefundId_key" ON "Payment"("providerRefundId");

CREATE TABLE "OrderTimelineEvent" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "actorEmail" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderTimelineEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrderTimelineEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "OrderSupportNote" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "authorEmail" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "customerVisible" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderSupportNote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrderSupportNote_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "TransactionalEmail" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "providerMessageId" TEXT,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  CONSTRAINT "TransactionalEmail_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TransactionalEmail_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "OrderTimelineEvent_orderId_createdAt_idx" ON "OrderTimelineEvent"("orderId", "createdAt");
CREATE INDEX "OrderSupportNote_orderId_createdAt_idx" ON "OrderSupportNote"("orderId", "createdAt");
CREATE INDEX "TransactionalEmail_orderId_createdAt_idx" ON "TransactionalEmail"("orderId", "createdAt");
CREATE UNIQUE INDEX "TransactionalEmail_orderId_type_key" ON "TransactionalEmail"("orderId", "type");
