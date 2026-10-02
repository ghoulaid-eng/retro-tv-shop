CREATE TYPE "CustomOrderRequestStatus" AS ENUM ('NEW', 'IN_REVIEW', 'QUOTED', 'CLOSED');

CREATE TABLE "CustomOrderRequest" (
    "id" TEXT NOT NULL,
    "status" "CustomOrderRequestStatus" NOT NULL DEFAULT 'NEW',
    "customerName" TEXT NOT NULL,
    "customerUsername" TEXT NOT NULL,
    "contactMethod" TEXT NOT NULL,
    "contactInfo" TEXT NOT NULL,
    "customizationLevel" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "formspreeDelivered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomOrderRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomOrderRequest_status_createdAt_idx" ON "CustomOrderRequest"("status", "createdAt");
