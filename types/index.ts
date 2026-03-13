import Decimal from 'decimal.js';

// Define types based on Prisma schema
export interface Opportunity {
  id: string;
  eventId: string;
  parkingProductId: string;
  opportunityScore: number;
  confidenceScore: number;
  estimatedBuyPrice: Decimal;
  estimatedSellPrice: Decimal;
  estimatedFees: Decimal;
  projectedProfit: Decimal;
  status: string;
  rationale: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Event {
  id: string;
  venueId: string;
  name: string;
  category: string;
  startTime: Date;
  endTime: Date | null;
  status: string;
  externalRefs: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Venue {
  id: string;
  name: string;
  city: string;
  state: string;
  timezone: string;
  externalRefs: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketObservation {
  id: string;
  eventId: string;
  parkingProductId: string;
  sourceId: string;
  observedPrice: Decimal;
  observedAt: Date;
  confidence: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface InventoryItem {
  id: string;
  parkingProductId: string;
  opportunityId: string | null;
  acquiredPrice: Decimal;
  quantity: number;
  status: string;
  acquiredAt: Date;
  expiresAt: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Sale {
  id: string;
  inventoryItemId: string;
  soldAt: Date;
  soldPrice: Decimal;
  netProfit: Decimal;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface Alert {
  id: string;
  opportunityId: string;
  channel: string;
  message: string;
  sentAt: Date | null;
  status: string;
  createdAt: Date;
}

export type OpportunityWithRelations = Opportunity & {
  event?: Event;
  latestObservation?: MarketObservation;
};

export type EventWithRelations = Event & {
  venue?: Venue;
};

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

export interface ScoringOptions {
  demandMultiplier?: number;
  manualOverride?: boolean;
}
