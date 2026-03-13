-- CreateEnum
CREATE TYPE "extractionMethod" AS ENUM ('API', 'SELENIUM', 'MANUAL');

-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(2) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    "externalRefs" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "venueId" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "sourceUrl" TEXT,
    "externalRefs" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL UNIQUE,
    "type" TEXT NOT NULL,
    "baseUrl" VARCHAR(500) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "ParkingProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "productName" VARCHAR(255) NOT NULL,
    "lotName" VARCHAR(255),
    "parkingType" VARCHAR(100),
    "sourceUrl" TEXT NOT NULL,
    "transferabilityStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "transferabilityNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ParkingProduct_eventId_sourceId_productName_key" UNIQUE("eventId", "sourceId", "productName"),
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE,
    FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE
);

-- CreateTable
CREATE TABLE "MarketObservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "parkingProductId" TEXT,
    "sourceId" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "rawPriceText" VARCHAR(100) NOT NULL,
    "normalizedPrice" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "availabilityText" TEXT,
    "inventoryCount" INTEGER,
    "transferabilityStatus" TEXT DEFAULT 'UNKNOWN',
    "rawSnapshot" JSONB NOT NULL DEFAULT '{}',
    "pageUrl" TEXT NOT NULL,
    "extractionMethod" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE,
    FOREIGN KEY ("parkingProductId") REFERENCES "ParkingProduct"("id") ON DELETE SET NULL,
    FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "parkingProductId" TEXT,
    "latestObservationId" TEXT,
    "sourceId" TEXT NOT NULL,
    "estimatedBuyPrice" DECIMAL(12,2),
    "estimatedSellPrice" DECIMAL(12,2),
    "estimatedFees" DECIMAL(12,2),
    "projectedProfit" DECIMAL(12,2),
    "confidenceScore" INTEGER NOT NULL DEFAULT 50,
    "opportunityScore" INTEGER NOT NULL DEFAULT 0,
    "rationale" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "manualNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Opportunity_eventId_parkingProductId_sourceId_key" UNIQUE("eventId", "parkingProductId", "sourceId"),
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE,
    FOREIGN KEY ("parkingProductId") REFERENCES "ParkingProduct"("id") ON DELETE SET NULL,
    FOREIGN KEY ("latestObservationId") REFERENCES "MarketObservation"("id") ON DELETE SET NULL,
    FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "parkingProductId" TEXT,
    "venueId" TEXT,
    "acquiredAt" TIMESTAMP(3) NOT NULL,
    "acquiredPrice" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "source" VARCHAR(100) NOT NULL,
    "externalOrderRef" VARCHAR(255),
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'HELD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE,
    FOREIGN KEY ("parkingProductId") REFERENCES "ParkingProduct"("id") ON DELETE SET NULL,
    FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inventoryItemId" TEXT NOT NULL,
    "soldAt" TIMESTAMP(3) NOT NULL,
    "soldPrice" DECIMAL(12,2) NOT NULL,
    "fees" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netProfit" DECIMAL(12,2) NOT NULL,
    "saleChannel" VARCHAR(100) NOT NULL,
    "externalSaleRef" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT,
    "opportunityId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'INAPP',
    "message" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL,
    FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL
);

-- CreateTable
CREATE TABLE "Watchlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "query" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "JobRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobType" VARCHAR(100) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "errorText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" VARCHAR(255) NOT NULL UNIQUE,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE INDEX "Event_venueId_idx" on "Event"("venueId");
CREATE INDEX "Event_startTime_idx" on "Event"("startTime");
CREATE INDEX "Event_status_idx" on "Event"("status");

-- CreateIndex
CREATE INDEX "Source_type_idx" on "Source"("type");

-- CreateIndex
CREATE INDEX "ParkingProduct_eventId_idx" on "ParkingProduct"("eventId");
CREATE INDEX "ParkingProduct_sourceId_idx" on "ParkingProduct"("sourceId");

-- CreateIndex
CREATE INDEX "MarketObservation_eventId_idx" on "MarketObservation"("eventId");
CREATE INDEX "MarketObservation_parkingProductId_idx" on "MarketObservation"("parkingProductId");
CREATE INDEX "MarketObservation_observedAt_idx" on "MarketObservation"("observedAt");
CREATE INDEX "MarketObservation_normalizedPrice_idx" on "MarketObservation"("normalizedPrice");

-- CreateIndex
CREATE INDEX "Opportunity_eventId_idx" on "Opportunity"("eventId");
CREATE INDEX "Opportunity_status_idx" on "Opportunity"("status");
CREATE INDEX "Opportunity_opportunityScore_idx" on "Opportunity"("opportunityScore");

-- CreateIndex
CREATE INDEX "InventoryItem_eventId_idx" on "InventoryItem"("eventId");
CREATE INDEX "InventoryItem_status_idx" on "InventoryItem"("status");

-- CreateIndex
CREATE INDEX "Sale_inventoryItemId_idx" on "Sale"("inventoryItemId");
CREATE INDEX "Sale_soldAt_idx" on "Sale"("soldAt");

-- CreateIndex
CREATE INDEX "Alert_eventId_idx" on "Alert"("eventId");
CREATE INDEX "Alert_opportunityId_idx" on "Alert"("opportunityId");
CREATE INDEX "Alert_status_idx" on "Alert"("status");

-- CreateIndex
CREATE INDEX "JobRun_jobType_idx" on "JobRun"("jobType");
CREATE INDEX "JobRun_status_idx" on "JobRun"("status");
