-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "parkingProductId" TEXT,
    "sourceId" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "normalizedPrice" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResaleSnapshot" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "source" VARCHAR(100) NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "minPrice" DECIMAL(12,2) NOT NULL,
    "maxPrice" DECIMAL(12,2) NOT NULL,
    "listingCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResaleSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandForecast" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "parkingProductId" TEXT,
    "forecastAt" TIMESTAMP(3) NOT NULL,
    "horizonDays" INTEGER NOT NULL,
    "predictedDemandLevel" DECIMAL(5,2),
    "recommendedBuyPrice" DECIMAL(12,2),
    "recommendedSellPrice" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemandForecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertRule" (
    "id" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "threshold" JSONB NOT NULL DEFAULT '{}',
    "eventId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'INAPP',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriceHistory_eventId_idx" ON "PriceHistory"("eventId");

-- CreateIndex
CREATE INDEX "PriceHistory_observedAt_idx" ON "PriceHistory"("observedAt");

-- CreateIndex
CREATE INDEX "ResaleSnapshot_eventId_idx" ON "ResaleSnapshot"("eventId");

-- CreateIndex
CREATE INDEX "ResaleSnapshot_observedAt_idx" ON "ResaleSnapshot"("observedAt");

-- CreateIndex
CREATE INDEX "DemandForecast_eventId_idx" ON "DemandForecast"("eventId");

-- CreateIndex
CREATE INDEX "DemandForecast_forecastAt_idx" ON "DemandForecast"("forecastAt");

-- CreateIndex
CREATE INDEX "AlertRule_type_idx" ON "AlertRule"("type");

-- CreateIndex
CREATE INDEX "AlertRule_isActive_idx" ON "AlertRule"("isActive");

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_parkingProductId_fkey" FOREIGN KEY ("parkingProductId") REFERENCES "ParkingProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResaleSnapshot" ADD CONSTRAINT "ResaleSnapshot_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandForecast" ADD CONSTRAINT "DemandForecast_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandForecast" ADD CONSTRAINT "DemandForecast_parkingProductId_fkey" FOREIGN KEY ("parkingProductId") REFERENCES "ParkingProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
