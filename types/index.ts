import { Opportunity, Event, Venue, MarketObservation, InventoryItem, Sale, Alert } from '@prisma/client';

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
