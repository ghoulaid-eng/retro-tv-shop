CREATE TABLE "CustomerProfile" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT,
    "contactMethod" TEXT,
    "contactInfo" TEXT,
    "shippingFullName" TEXT,
    "shippingAddressLine1" TEXT,
    "shippingAddressLine2" TEXT,
    "shippingCity" TEXT,
    "shippingState" TEXT,
    "shippingPostalCode" TEXT,
    "shippingCountry" TEXT,
    "stripeCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerProfile_email_key" ON "CustomerProfile"("email");
CREATE UNIQUE INDEX "CustomerProfile_stripeCustomerId_key" ON "CustomerProfile"("stripeCustomerId");

ALTER TABLE "Order" ADD COLUMN "customerId" TEXT;
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId", "createdAt");
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CustomerProfile" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "CustomerProfile" FROM PUBLIC;
REVOKE ALL ON TABLE "CustomerProfile" FROM anon;
REVOKE ALL ON TABLE "CustomerProfile" FROM authenticated;
