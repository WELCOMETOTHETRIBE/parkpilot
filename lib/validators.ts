import { z } from 'zod';

// Venue validators
export const CreateVenueSchema = z.object({
  name: z.string().min(1).max(255),
  city: z.string().min(1).max(100),
  state: z.string().length(2).toUpperCase(),
  timezone: z.string().default('America/Los_Angeles'),
});

export const UpdateVenueSchema = CreateVenueSchema.partial();

// Event validators
export const CreateEventSchema = z.object({
  venueId: z.string().cuid(),
  name: z.string().min(1).max(255),
  category: z.string().min(1).max(100),
  startTime: z.coerce.date(),
  endTime: z.coerce.date().optional(),
  status: z.enum(['UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
  sourceUrl: z.string().url().optional(),
});

export const UpdateEventSchema = CreateEventSchema.partial();

// Market Observation validators
export const CreateObservationSchema = z.object({
  eventId: z.string().cuid(),
  parkingProductId: z.string().cuid().optional(),
  sourceId: z.string().cuid(),
  observedAt: z.coerce.date(),
  rawPriceText: z.string().max(100),
  normalizedPrice: z.coerce.number().positive(),
  currency: z.string().length(3).default('USD'),
  availabilityText: z.string().optional(),
  inventoryCount: z.coerce.number().int().nonnegative().optional(),
  transferabilityStatus: z.enum(['UNKNOWN', 'YES', 'NO']).optional(),
  pageUrl: z.string().url(),
  extractionMethod: z.enum(['API', 'SELENIUM', 'MANUAL']).default('MANUAL'),
  rawSnapshot: z.record(z.unknown()).optional(),
});

// Opportunity filters
export const OpportunityFilterSchema = z.object({
  venueId: z.string().cuid().optional(),
  eventId: z.string().cuid().optional(),
  status: z.enum(['OPEN', 'WATCHING', 'ACTIONED', 'CLOSED', 'REJECTED']).optional(),
  minScore: z.coerce.number().int().min(0).max(1000).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
  sortKey: z.enum(['opportunityScore', 'projectedProfit', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const UpdateOpportunitySchema = z.object({
  estimatedBuyPrice: z.coerce.number().positive().optional(),
  estimatedSellPrice: z.coerce.number().positive().optional(),
  estimatedFees: z.coerce.number().nonnegative().optional(),
  confidenceScore: z.coerce.number().int().min(0).max(100).optional(),
  status: z.enum(['OPEN', 'WATCHING', 'ACTIONED', 'CLOSED', 'REJECTED']).optional(),
  manualNotes: z.string().optional(),
});

// Inventory validators
export const CreateInventorySchema = z.object({
  eventId: z.string().cuid(),
  parkingProductId: z.string().cuid().optional(),
  acquiredAt: z.coerce.date(),
  acquiredPrice: z.coerce.number().positive(),
  quantity: z.coerce.number().int().positive().default(1),
  source: z.string().max(100),
  externalOrderRef: z.string().max(255).optional(),
  notes: z.string().optional(),
});

// Sale validators
export const CreateSaleSchema = z.object({
  inventoryItemId: z.string().cuid(),
  soldAt: z.coerce.date(),
  soldPrice: z.coerce.number().positive(),
  fees: z.coerce.number().nonnegative().default(0),
  saleChannel: z.string().max(100),
  externalSaleRef: z.string().max(255).optional(),
});

export type CreateVenue = z.infer<typeof CreateVenueSchema>;
export type UpdateVenue = z.infer<typeof UpdateVenueSchema>;
export type CreateEvent = z.infer<typeof CreateEventSchema>;
export type UpdateEvent = z.infer<typeof UpdateEventSchema>;
export type CreateObservation = z.infer<typeof CreateObservationSchema>;
export type OpportunityFilter = z.infer<typeof OpportunityFilterSchema>;
export type UpdateOpportunity = z.infer<typeof UpdateOpportunitySchema>;
export type CreateInventory = z.infer<typeof CreateInventorySchema>;
export type CreateSale = z.infer<typeof CreateSaleSchema>;
