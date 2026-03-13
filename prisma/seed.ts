import { PrismaClient } from '@prisma/client';
import Decimal from 'decimal.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data (careful in production!)
  await prisma.sale.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.marketObservation.deleteMany();
  await prisma.parkingProduct.deleteMany();
  await prisma.event.deleteMany();
  await prisma.source.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.watchlist.deleteMany();
  await prisma.jobRun.deleteMany();
  await prisma.appSetting.deleteMany();

  // Create venues
  const sofi = await prisma.venue.create({
    data: {
      name: 'SoFi Stadium',
      city: 'Inglewood',
      state: 'CA',
      timezone: 'America/Los_Angeles',
      externalRefs: { ticketmaster_id: 'sofi_stadium' },
    },
  });

  await prisma.venue.create({
    data: {
      name: 'Dodger Stadium',
      city: 'Los Angeles',
      state: 'CA',
      timezone: 'America/Los_Angeles',
      externalRefs: { ticketmaster_id: 'dodger_stadium' },
    },
  });

  const cryptoCom = await prisma.venue.create({
    data: {
      name: 'Crypto.com Arena',
      city: 'Los Angeles',
      state: 'CA',
      timezone: 'America/Los_Angeles',
      externalRefs: { ticketmaster_id: 'crypto_arena' },
    },
  });

  console.log('✓ Created 3 venues');

  // Create events
  const now = new Date();
  const in5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  const in10Days = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

  const lakers = await prisma.event.create({
    data: {
      venueId: cryptoCom.id,
      name: 'Lakers vs Celtics',
      category: 'Sports',
      startTime: in5Days,
      endTime: new Date(in5Days.getTime() + 3 * 60 * 60 * 1000),
      status: 'UPCOMING',
      sourceUrl: 'https://example.com/lakers-game',
      externalRefs: { ticketmaster_event_id: 'evt_123' },
    },
  });

  const rams = await prisma.event.create({
    data: {
      venueId: sofi.id,
      name: 'LA Rams vs Niners',
      category: 'Sports',
      startTime: in10Days,
      endTime: new Date(in10Days.getTime() + 4 * 60 * 60 * 1000),
      status: 'UPCOMING',
      sourceUrl: 'https://example.com/rams-game',
      externalRefs: { ticketmaster_event_id: 'evt_124' },
    },
  });

  console.log('✓ Created 2 events');

  // Create sources
  const officialApi = await prisma.source.create({
    data: {
      name: 'Official Ticketmaster API',
      type: 'search_api',
      baseUrl: 'https://api.ticketmaster.com',
      isActive: true,
      config: { reliability: 95 },
    },
  });

  const parkingLotWebsite = await prisma.source.create({
    data: {
      name: 'ParkWhiz',
      type: 'scraper',
      baseUrl: 'https://parkwhiz.com',
      isActive: true,
      config: { reliability: 80 },
    },
  });

  await prisma.source.create({
    data: {
      name: 'Manual Entry',
      type: 'manual',
      baseUrl: 'admin',
      isActive: true,
      config: {},
    },
  });

  console.log('✓ Created 3 sources');

  // Create parking products
  const premiumLot = await prisma.parkingProduct.create({
    data: {
      eventId: lakers.id,
      sourceId: parkingLotWebsite.id,
      productName: 'Premium Lot A',
      lotName: 'Lot A',
      parkingType: 'premium',
      sourceUrl: 'https://parkwhiz.com/crypto-arena-premium',
      transferabilityStatus: 'YES',
      transferabilityNote: 'Digital pass transferable',
    },
  });

  const standardLot = await prisma.parkingProduct.create({
    data: {
      eventId: lakers.id,
      sourceId: parkingLotWebsite.id,
      productName: 'Standard Lot B',
      lotName: 'Lot B',
      parkingType: 'standard',
      sourceUrl: 'https://parkwhiz.com/crypto-arena-standard',
      transferabilityStatus: 'UNKNOWN',
      transferabilityNote: 'Unknown - contact seller',
    },
  });

  const ramsPremium = await prisma.parkingProduct.create({
    data: {
      eventId: rams.id,
      sourceId: officialApi.id,
      productName: 'Premium Parking',
      parkingType: 'premium',
      sourceUrl: 'https://ticketmaster.com/rams-parking',
      transferabilityStatus: 'YES',
    },
  });

  console.log('✓ Created 3 parking products');

  // Create market observations
  const obs1 = await prisma.marketObservation.create({
    data: {
      eventId: lakers.id,
      parkingProductId: premiumLot.id,
      sourceId: parkingLotWebsite.id,
      observedAt: now,
      rawPriceText: '$35.00',
      normalizedPrice: new Decimal('35.00'),
      currency: 'USD',
      availabilityText: '24 spots available',
      inventoryCount: 24,
      transferabilityStatus: 'YES',
      pageUrl: 'https://parkwhiz.com/crypto-arena-premium',
      extractionMethod: 'SELENIUM',
      rawSnapshot: { status: 'active', pricePerHour: null },
    },
  });

  await prisma.marketObservation.create({
    data: {
      eventId: lakers.id,
      parkingProductId: standardLot.id,
      sourceId: parkingLotWebsite.id,
      observedAt: now,
      rawPriceText: '$25.00',
      normalizedPrice: new Decimal('25.00'),
      currency: 'USD',
      availabilityText: 'Limited availability',
      inventoryCount: 5,
      transferabilityStatus: 'UNKNOWN',
      pageUrl: 'https://parkwhiz.com/crypto-arena-standard',
      extractionMethod: 'SELENIUM',
      rawSnapshot: {},
    },
  });

  const obs3 = await prisma.marketObservation.create({
    data: {
      eventId: rams.id,
      parkingProductId: ramsPremium.id,
      sourceId: officialApi.id,
      observedAt: now,
      rawPriceText: '$50',
      normalizedPrice: new Decimal('50.00'),
      currency: 'USD',
      availabilityText: '100+ available',
      inventoryCount: 100,
      transferabilityStatus: 'YES',
      pageUrl: 'https://ticketmaster.com/rams-parking',
      extractionMethod: 'API',
      rawSnapshot: { inventory_level: 'high' },
    },
  });

  console.log('✓ Created 3 market observations');

  // Create opportunities
  const opp1 = await prisma.opportunity.create({
    data: {
      eventId: lakers.id,
      parkingProductId: premiumLot.id,
      sourceId: parkingLotWebsite.id,
      latestObservationId: obs1.id,
      estimatedBuyPrice: new Decimal('35.00'),
      estimatedSellPrice: new Decimal('60.00'),
      estimatedFees: new Decimal('5.00'),
      projectedProfit: new Decimal('20.00'),
      confidenceScore: 75,
      opportunityScore: 580,
      status: 'OPEN',
      rationale: {
        marginScore: 250,
        timeScore: 100,
        sourceScore: 112,
        freshnessScore: 100,
        description: 'Strong opportunity: good margin, fresh data, 5 days to event',
      },
    },
  });

  await prisma.opportunity.create({
    data: {
      eventId: rams.id,
      parkingProductId: ramsPremium.id,
      sourceId: officialApi.id,
      latestObservationId: obs3.id,
      estimatedBuyPrice: new Decimal('50.00'),
      estimatedSellPrice: new Decimal('85.00'),
      estimatedFees: new Decimal('8.00'),
      projectedProfit: new Decimal('27.00'),
      confidenceScore: 85,
      opportunityScore: 680,
      status: 'WATCHING',
      rationale: {
        marginScore: 270,
        timeScore: 100,
        sourceScore: 142,
        freshnessScore: 100,
        description: 'Excellent opportunity: high confidence, official API source',
      },
    },
  });

  console.log('✓ Created 2 opportunities');

  // Create inventory items
  const inventory1 = await prisma.inventoryItem.create({
    data: {
      eventId: lakers.id,
      parkingProductId: premiumLot.id,
      venueId: cryptoCom.id,
      acquiredAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      acquiredPrice: new Decimal('35.00'),
      quantity: 5,
      source: 'direct',
      externalOrderRef: 'PW-2024-001',
      notes: 'Purchased at bulk discount',
      status: 'HELD',
    },
  });

  console.log('✓ Created 1 inventory item');

  // Create a sale
  await prisma.sale.create({
    data: {
      inventoryItemId: inventory1.id,
      soldAt: now,
      soldPrice: new Decimal('60.00'),
      fees: new Decimal('5.00'),
      netProfit: new Decimal('20.00'),
      saleChannel: 'stubhub',
      externalSaleRef: 'SH-2024-555',
    },
  });

  console.log('✓ Created 1 sale record');

  // Create an alert
  await prisma.alert.create({
    data: {
      opportunityId: opp1.id,
      channel: 'INAPP',
      message: 'Strong parking opportunity detected: $20 profit potential',
      status: 'PENDING',
    },
  });

  console.log('✓ Created 1 alert');

  // Create settings
  await prisma.appSetting.create({
    data: {
      key: 'discovery_enabled',
      value: true,
    },
  });

  await prisma.appSetting.create({
    data: {
      key: 'min_confidence_for_alert',
      value: 65,
    },
  });

  console.log('✓ Created 2 app settings');

  console.log('✅ Database seeding complete!');
}

main()
  .catch(e => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
