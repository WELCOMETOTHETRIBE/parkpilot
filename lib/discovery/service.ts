import { db } from '@/lib/db';
import serpApiClient from '@/lib/serpapi/client';
import Decimal from 'decimal.js';
import { scoreOpportunity, estimateSourceReliability } from '@/lib/scoring/engine';

interface ParsedEvent {
  name: string;
  category: string;
  startTime: Date;
  endTime?: Date;
  sourceUrl: string;
}

interface ParsedParkingOpportunity {
  productName: string;
  lotName?: string;
  sourceUrl: string;
  price?: Decimal;
  availability?: string;
}

/**
 * Discovery service for finding venues, events, and parking opportunities via SerpAPI
 */
export class DiscoveryService {
  /**
   * Search for major venues in a city
   */
  async discoverVenues(city: string, state: string): Promise<any[]> {
    const query = `major venues ${city} ${state} stadium arena concert hall`;
    const results = await serpApiClient.search(query);
    
    // Parse venue names from search results
    const venues: Array<{ name: string; city: string; state: string; sourceUrl: string }> = [];
    const seen = new Set<string>();
    
    for (const result of results.results) {
      // Extract venue name from title (heuristic)
      const title = result.title.toLowerCase();
      const venueKeywords = ['stadium', 'arena', 'center', 'theatre', 'theater', 'hall', 'field', 'park'];
      const hasVenueKeyword = venueKeywords.some(kw => title.includes(kw));
      
      if (hasVenueKeyword && !seen.has(result.title)) {
        seen.add(result.title);
        venues.push({
          name: result.title.replace(/ - .*$/, '').trim(), // Remove location suffix
          city,
          state,
          sourceUrl: result.link,
        });
      }
    }
    
    return venues;
  }

  /**
   * Search for upcoming events at a venue
   */
  async discoverEvents(venueName: string, venueId: string): Promise<ParsedEvent[]> {
    const currentYear = new Date().getFullYear();
    const query = `${venueName} upcoming events ${currentYear}`;
    const results = await serpApiClient.search(query);
    
    const events: ParsedEvent[] = [];
    const seen = new Set<string>();
    
    for (const result of results.results) {
      const title = result.title.toLowerCase();
      const snippet = result.snippet.toLowerCase();
      
      // Look for date patterns and event indicators
      const datePattern = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}/i;
      const hasDate = datePattern.test(title) || datePattern.test(snippet);
      const eventKeywords = ['tickets', 'event', 'game', 'concert', 'show', 'match'];
      const hasEventKeyword = eventKeywords.some(kw => title.includes(kw) || snippet.includes(kw));
      
      if (hasDate && hasEventKeyword && !seen.has(result.title)) {
        seen.add(result.title);
        
        // Try to extract date from title or snippet
        const dateMatch = (title + ' ' + snippet).match(datePattern);
        let startTime = new Date();
        if (dateMatch) {
          // Simple date parsing (could be improved)
          startTime = this.parseEventDate(dateMatch[0], currentYear);
        }
        
        // Determine category from keywords
        const category = this.inferCategory(title + ' ' + snippet);
        
        events.push({
          name: result.title.replace(/ - .*$/, '').replace(/ tickets?.*$/i, '').trim(),
          category,
          startTime,
          sourceUrl: result.link,
        });
      }
    }
    
    return events;
  }

  /**
   * Search for parking opportunities for an event
   */
  async discoverParking(eventName: string, venueName: string, eventId: string): Promise<ParsedParkingOpportunity[]> {
    const query = `${venueName} ${eventName} parking`;
    const results = await serpApiClient.search(query);
    
    const opportunities: ParsedParkingOpportunity[] = [];
    const seen = new Set<string>();
    
    for (const result of results.results) {
      const title = result.title.toLowerCase();
      const snippet = result.snippet.toLowerCase();
      
      // Look for parking-related keywords
      const parkingKeywords = ['parking', 'lot', 'garage', 'valet', 'spot', 'space'];
      const hasParkingKeyword = parkingKeywords.some(kw => title.includes(kw) || snippet.includes(kw));
      
      // Look for price indicators
      const pricePattern = /\$(\d+(?:\.\d{2})?)/g;
      const prices: number[] = [];
      let match;
      while ((match = pricePattern.exec(title + ' ' + snippet)) !== null) {
        prices.push(parseFloat(match[1]));
      }
      
      if (hasParkingKeyword && !seen.has(result.link)) {
        seen.add(result.link);
        
        opportunities.push({
          productName: result.title.replace(/ - .*$/, '').trim(),
          lotName: this.extractLotName(result.title, result.snippet),
          sourceUrl: result.link,
          price: prices.length > 0 ? new Decimal(prices[0]) : undefined,
          availability: this.extractAvailability(result.snippet),
        });
      }
    }
    
    return opportunities;
  }

  /**
   * Create or find a venue, then discover events and parking
   */
  async discoverVenueWithEvents(venueName: string, city: string, state: string) {
    // Find or create venue
    let venue = await db.venue.findFirst({
      where: {
        name: { contains: venueName, mode: 'insensitive' },
        city: { equals: city, mode: 'insensitive' },
        state: { equals: state, mode: 'insensitive' },
      },
    });

    if (!venue) {
      venue = await db.venue.create({
        data: {
          name: venueName,
          city,
          state,
          timezone: this.getTimezone(city, state),
        },
      });
    }

    // Discover events
    const parsedEvents = await this.discoverEvents(venueName, venue.id);
    const events = [];

    for (const parsedEvent of parsedEvents) {
      // Check if event already exists
      const existing = await db.event.findFirst({
        where: {
          venueId: venue.id,
          name: { contains: parsedEvent.name, mode: 'insensitive' },
          startTime: {
            gte: new Date(parsedEvent.startTime.getTime() - 24 * 60 * 60 * 1000), // Within 24 hours
            lte: new Date(parsedEvent.startTime.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      });

      if (!existing) {
        const event = await db.event.create({
          data: {
            venueId: venue.id,
            name: parsedEvent.name,
            category: parsedEvent.category,
            startTime: parsedEvent.startTime,
            endTime: parsedEvent.endTime,
            sourceUrl: parsedEvent.sourceUrl,
            status: 'UPCOMING',
          },
        });
        events.push(event);

        // Discover parking for this event
        await this.discoverParkingForEvent(event, venueName);
      }
    }

    return { venue, events };
  }

  /**
   * Discover parking opportunities for an event and create opportunities
   */
  async discoverParkingForEvent(event: any, venueName: string) {
    // Get or create a "SerpAPI" source
    let source = await db.source.findFirst({
      where: { name: 'SerpAPI Discovery' },
    });

    if (!source) {
      source = await db.source.create({
        data: {
          name: 'SerpAPI Discovery',
          type: 'search_api',
          baseUrl: 'https://serpapi.com',
          isActive: true,
        },
      });
    }

    const parkingOps = await this.discoverParking(event.name, venueName, event.id);

    for (const op of parkingOps) {
      // Create parking product
      const product = await db.parkingProduct.create({
        data: {
          eventId: event.id,
          sourceId: source.id,
          productName: op.productName,
          lotName: op.lotName,
          sourceUrl: op.sourceUrl,
          transferabilityStatus: 'UNKNOWN',
        },
      });

      // Create market observation if we have price data
      if (op.price) {
        const observation = await db.marketObservation.create({
          data: {
            eventId: event.id,
            parkingProductId: product.id,
            sourceId: source.id,
            observedAt: new Date(),
            rawPriceText: `$${op.price.toString()}`,
            normalizedPrice: op.price,
            currency: 'USD',
            availabilityText: op.availability,
            pageUrl: op.sourceUrl,
            extractionMethod: 'API',
          },
        });

        // Create opportunity using scoring engine
        const estimatedFees = new Decimal('5.00'); // Default fees
        const estimatedSellPrice = op.price.times(1.3); // 30% markup estimate
        const margin = estimatedSellPrice.minus(op.price).minus(estimatedFees);

        // Get event and source for scoring
        const [eventData, sourceData] = await Promise.all([
          db.event.findUnique({ where: { id: event.id } }),
          db.source.findUnique({ where: { id: source.id } }),
        ]);
        if (eventData && sourceData) {
          const sourceReliability = estimateSourceReliability(
            sourceData.type,
            sourceData.config as { historicalAccuracy?: number }
          );
          const { opportunityScore, confidenceScore, rationale } = scoreOpportunity({
            estimatedBuyPrice: op.price,
            estimatedSellPrice,
            estimatedFees,
            eventStartTime: eventData.startTime,
            observationTime: observation.observedAt,
            sourceReliability,
            confidenceScore: 50, // Default confidence
            transferabilityStatus: product.transferabilityStatus as 'UNKNOWN' | 'YES' | 'NO',
            demandMultiplier: 1.0,
          });

          // Check if opportunity already exists
          const existing = await db.opportunity.findFirst({
            where: {
              eventId: event.id,
              sourceId: source.id,
              parkingProductId: product.id,
            },
          });

          const rationaleJson = JSON.parse(JSON.stringify(rationale)) as object;

          if (existing) {
            await db.opportunity.update({
              where: { id: existing.id },
              data: {
                latestObservationId: observation.id,
                estimatedBuyPrice: op.price,
                estimatedSellPrice,
                estimatedFees,
                projectedProfit: margin,
                opportunityScore,
                confidenceScore,
                rationale: rationaleJson,
              },
            });
          } else {
            await db.opportunity.create({
              data: {
                eventId: event.id,
                sourceId: source.id,
                parkingProductId: product.id,
                latestObservationId: observation.id,
                estimatedBuyPrice: op.price,
                estimatedSellPrice,
                estimatedFees,
                projectedProfit: margin,
                opportunityScore,
                confidenceScore,
                rationale: rationaleJson,
                status: 'OPEN',
              },
            });
          }
        }
      }
    }
  }

  // Helper methods
  private parseEventDate(dateStr: string, year: number): Date {
    // Simple date parsing - could be improved
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
    
    const match = dateStr.match(/(\w{3})\w*\s+(\d{1,2})/i);
    if (match) {
      const month = months[match[1].toLowerCase().substring(0, 3)];
      const day = parseInt(match[2]);
      if (month !== undefined) {
        return new Date(year, month, day, 19, 0, 0); // Default to 7 PM
      }
    }
    
    return new Date();
  }

  private inferCategory(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('sport') || lower.includes('game') || lower.includes('match')) return 'Sports';
    if (lower.includes('concert') || lower.includes('music')) return 'Music';
    if (lower.includes('theatre') || lower.includes('theater') || lower.includes('show')) return 'Theater';
    if (lower.includes('conference') || lower.includes('convention')) return 'Conference';
    return 'Other';
  }

  private extractLotName(title: string, snippet: string): string | undefined {
    const lotPattern = /(lot\s+[a-z0-9]+|garage|valet|parking\s+[a-z0-9]+)/i;
    const match = (title + ' ' + snippet).match(lotPattern);
    return match ? match[0] : undefined;
  }

  private extractAvailability(snippet: string): string | undefined {
    const availKeywords = ['available', 'sold out', 'limited', 'few left'];
    for (const keyword of availKeywords) {
      if (snippet.toLowerCase().includes(keyword)) {
        return keyword;
      }
    }
    return undefined;
  }

  private getTimezone(city: string, state: string): string {
    // Simple timezone mapping - could be improved
    const pacific = ['CA', 'OR', 'WA', 'NV'];
    const mountain = ['MT', 'ID', 'WY', 'CO', 'NM', 'AZ', 'UT'];
    const central = ['TX', 'OK', 'AR', 'LA', 'MS', 'AL', 'TN', 'KY', 'MO', 'IA', 'MN', 'WI', 'IL', 'IN', 'MI', 'OH', 'ND', 'SD', 'NE', 'KS'];
    const eastern = ['FL', 'GA', 'SC', 'NC', 'VA', 'WV', 'MD', 'DE', 'PA', 'NJ', 'NY', 'CT', 'RI', 'MA', 'VT', 'NH', 'ME'];
    
    if (pacific.includes(state)) return 'America/Los_Angeles';
    if (mountain.includes(state)) return 'America/Denver';
    if (central.includes(state)) return 'America/Chicago';
    if (eastern.includes(state)) return 'America/New_York';
    return 'America/Los_Angeles'; // Default
  }
}

export const discoveryService = new DiscoveryService();
