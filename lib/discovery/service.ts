import { db } from '@/lib/db';
import serpApiClient from '@/lib/serpapi/client';
import Decimal from 'decimal.js';
import { scoreOpportunity, estimateSourceReliability } from '@/lib/scoring/engine';
import { parseEventsFromSerpResults, parseParkingFromSerpResults } from '@/lib/ai/parse-discovery';
import { env } from '@/lib/env';

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
  async discoverVenues(city: string, state: string): Promise<Array<{ name: string; city: string; state: string; sourceUrl: string }>> {
    // Search for specific well-known venues in the city
    const queries = [
      `${city} ${state} stadium`,
      `${city} ${state} arena`,
      `${city} ${state} concert venue`,
      `${city} ${state} amphitheater`,
    ];
    
    const allResults: Array<{ name: string; city: string; state: string; sourceUrl: string }> = [];
    const seen = new Set<string>();
    
    for (const query of queries) {
      const results = await serpApiClient.search(query);
      
      for (const result of results.results) {
        const title = result.title.toLowerCase();
        const snippet = result.snippet?.toLowerCase() || '';
        
        // Skip list articles and generic pages
        const skipPatterns = [
          'best', 'top', 'list', 'guide', 'review', 'tripadvisor', 'yelp',
          'the 15', 'the 10', 'top 10', 'best of', 'all you need'
        ];
        const isListArticle = skipPatterns.some(pattern => title.includes(pattern));
        
        if (isListArticle) continue;
        
        // Look for actual venue names - they usually have specific names
        const venueKeywords = ['stadium', 'arena', 'center', 'theatre', 'theater', 'hall', 'field', 'amphitheater', 'coliseum', 'forum'];
        const hasVenueKeyword = venueKeywords.some(kw => title.includes(kw) || snippet.includes(kw));
        
        // Extract venue name - remove common suffixes and location info
        let venueName = result.title
          .replace(/\s*-\s*.*$/i, '') // Remove " - Location" suffix
          .replace(/\s*\|.*$/i, '') // Remove " | Site" suffix
          .replace(/\s*\(.*?\)/g, '') // Remove parenthetical info
          .replace(/\s*\[.*?\]/g, '') // Remove bracket info
          .trim();
        
        // Skip if it's too generic or looks like a list
        if (venueName.length < 5 || venueName.toLowerCase().includes('best') || venueName.toLowerCase().includes('top')) {
          continue;
        }
        
        // Only include if it looks like a real venue name
        if (hasVenueKeyword && !seen.has(venueName.toLowerCase())) {
          seen.add(venueName.toLowerCase());
          allResults.push({
            name: venueName,
            city,
            state,
            sourceUrl: result.link,
          });
        }
      }
    }
    
    // Limit to top 10 unique venues
    return allResults.slice(0, 10);
  }

  /**
   * Search for upcoming events at a venue
   */
  async discoverEvents(venueName: string, _venueId: string): Promise<ParsedEvent[]> {
    const currentYear = new Date().getFullYear();
    
    const queries = [
      `${venueName} schedule ${currentYear}`,
      `${venueName} events calendar ${currentYear}`,
      `${venueName} upcoming concerts ${currentYear}`,
      `${venueName} tickets ${currentYear}`,
      `${venueName} games ${currentYear}`,
    ];
    
    const allEvents: ParsedEvent[] = [];
    const seen = new Set<string>();
    const rawResults: Array<{ title: string; snippet: string; link: string }> = [];
    
    for (const query of queries) {
      const results = await serpApiClient.search(query);
      for (const r of results.results) {
        rawResults.push({ title: r.title, snippet: r.snippet ?? '', link: r.link });
      }
      
      for (const result of results.results) {
        const title = result.title;
        const snippet = result.snippet || '';
        const fullText = (title + ' ' + snippet).toLowerCase();
        
        // Skip venue info pages, not event pages
        if (fullText.includes('about') && fullText.includes('venue') && !fullText.includes('event')) {
          continue;
        }
        
        // Skip social media profiles
        if (result.link.includes('facebook.com') || result.link.includes('instagram.com') || result.link.includes('twitter.com')) {
          continue;
        }
        
        // Look for various date patterns first
        const datePatterns = [
          /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:,?\s+\d{4})?/i, // "Jan 15" or "January 15, 2026"
          /\b\d{1,2}\/\d{1,2}\/\d{2,4}/, // "1/15/2026" or "01/15/26"
          /\b\d{1,2}-\d{1,2}-\d{2,4}/, // "1-15-2026"
          /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:,?\s+\d{4})?/i, // Full month names
        ];
        
        let foundDate: string | null = null;
        for (const pattern of datePatterns) {
          const match = fullText.match(pattern);
          if (match) {
            foundDate = match[0];
            break;
          }
        }
        
        // Skip schedule/calendar pages (they're not individual events)
        const scheduleKeywords = ['schedule', 'calendar', 'all events', 'upcoming events', 'event calendar', 'full schedule'];
        const isSchedulePage = scheduleKeywords.some(kw => title.includes(kw) || snippet.includes(kw));
        if (isSchedulePage && !foundDate) {
          continue; // Only skip if it's a schedule page AND has no specific date
        }
        
        // Look for event indicators (more flexible)
        const eventIndicators = [
          'ticket', 'event', 'game', 'concert', 'show', 'match', 'performance',
          'schedule', 'calendar', 'tour', 'series', 'vs', 'v.', 'versus',
          'live', 'on stage', 'playing', 'appearing'
        ];
        const hasEventIndicator = eventIndicators.some(indicator => fullText.includes(indicator));
        
        // Also check if it's a ticketmaster, stubhub, seatgeek, etc. link
        const isTicketSite = /ticketmaster|stubhub|seatgeek|ticketmaster|vividseats|tickets\.com/i.test(result.link);
        
        // Extract event name - clean up the title
        let eventName = result.title // Use original title, not lowercase
          .replace(/\s*-\s*.*$/i, '') // Remove " - Location" suffix
          .replace(/\s*\|\s*.*$/i, '') // Remove " | Site" suffix
          .replace(/\s*\(.*?\)/g, '') // Remove parenthetical info
          .replace(/\s*tickets?\s*.*$/i, '') // Remove "tickets" suffix
          .replace(/\s*at\s+.*$/i, '') // Remove "at Venue" suffix
          .replace(/\s*schedule.*$/i, '') // Remove "schedule" suffix
          .replace(/\s*calendar.*$/i, '') // Remove "calendar" suffix
          .replace(/\s*upcoming\s+events?.*$/i, '') // Remove "upcoming events" suffix
          .replace(/\s*2026.*$/i, '') // Remove year suffix
          .trim();
        
        // Skip if it's too generic, just the venue name, or looks like a schedule page
        const lowerName = eventName.toLowerCase();
        const lowerVenue = venueName.toLowerCase();
        if (eventName.length < 5 || 
            lowerName === lowerVenue || 
            lowerName.includes('schedule') || 
            lowerName.includes('calendar') ||
            lowerName.includes('all events') ||
            lowerName.startsWith(lowerVenue + ' ')) {
          continue;
        }
        
        // If event name still contains venue name at the start, remove it
        if (lowerName.startsWith(lowerVenue)) {
          eventName = eventName.substring(venueName.length).trim();
          // Remove leading punctuation
          eventName = eventName.replace(/^[,\s|-]+/, '').trim();
        }
        
        // Skip if name is now too short
        if (eventName.length < 3) {
          continue;
        }
        
        // Create event if we have a date OR it's a ticket site OR it has strong event indicators
        if ((foundDate || isTicketSite || hasEventIndicator) && !seen.has(eventName.toLowerCase())) {
          seen.add(eventName.toLowerCase());
          
          // Parse date if found
          let startTime = new Date();
          if (foundDate) {
            startTime = this.parseEventDate(foundDate, currentYear);
          } else {
            // Default to 30 days from now if no date found
            startTime = new Date();
            startTime.setDate(startTime.getDate() + 30);
          }
          
          // Determine category
          const category = this.inferCategory(fullText);
          
          allEvents.push({
            name: eventName,
            category,
            startTime,
            sourceUrl: result.link,
          });
        }
      }
    }

    if (env.OPENAI_API_KEY?.trim() && rawResults.length > 0) {
      try {
        const aiEvents = await parseEventsFromSerpResults(rawResults, venueName);
        for (const ai of aiEvents) {
          const already = allEvents.some(
            (e) => e.name.toLowerCase() === ai.name.toLowerCase() &&
              Math.abs(e.startTime.getTime() - ai.startTime.getTime()) < 24 * 60 * 60 * 1000
          );
          if (!already) allEvents.push({ ...ai, endTime: undefined });
        }
      } catch {
        // keep regex-only results
      }
    }
    
    return allEvents
      .filter((event, index, self) => 
        index === self.findIndex(e => e.name.toLowerCase() === event.name.toLowerCase())
      )
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
      .slice(0, 20);
  }

  /**
   * Search for parking opportunities for an event
   */
  async discoverParking(eventName: string, venueName: string, _eventId: string): Promise<ParsedParkingOpportunity[]> {
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

    if (env.OPENAI_API_KEY?.trim() && results.results.length > 0) {
      try {
        const aiParking = await parseParkingFromSerpResults(results.results);
        for (const p of aiParking) {
          if (!seen.has(p.sourceUrl)) {
            seen.add(p.sourceUrl);
            opportunities.push({
              productName: p.productName,
              lotName: p.lotName,
              sourceUrl: p.sourceUrl,
              price: p.price,
              availability: p.availability,
            });
          }
        }
      } catch {
        // keep regex-only results
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
      // Check if parking product already exists, or create it
      const existingProduct = await db.parkingProduct.findFirst({
        where: {
          eventId: event.id,
          sourceId: source.id,
          productName: op.productName,
        },
      });

      const product = existingProduct || await db.parkingProduct.create({
        data: {
          eventId: event.id,
          sourceId: source.id,
          productName: op.productName,
          lotName: op.lotName,
          sourceUrl: op.sourceUrl,
          transferabilityStatus: 'UNKNOWN',
        },
      });

      // Update if it existed but had different info
      if (existingProduct && (existingProduct.lotName !== op.lotName || existingProduct.sourceUrl !== op.sourceUrl)) {
        await db.parkingProduct.update({
          where: { id: product.id },
          data: {
            lotName: op.lotName || existingProduct.lotName,
            sourceUrl: op.sourceUrl,
          },
        });
      }

      // Create market observation (even without price, we can track availability)
      if (op.price || op.availability || op.sourceUrl) {
        const observation = await db.marketObservation.create({
          data: {
            eventId: event.id,
            parkingProductId: product.id,
            sourceId: source.id,
            observedAt: new Date(),
            rawPriceText: op.price ? `$${op.price.toString()}` : 'Price not available',
            normalizedPrice: op.price || new Decimal('0.00'),
            currency: 'USD',
            availabilityText: op.availability,
            pageUrl: op.sourceUrl,
            extractionMethod: 'API',
          },
        });

        // Create opportunity using scoring engine (only if we have a price)
        if (op.price && op.price.gt(0)) {
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
  }

  // Helper methods
  private parseEventDate(dateStr: string, defaultYear: number): Date {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Try to parse various date formats
    // Format 1: "Jan 15" or "January 15"
    const monthNameMatch = dateStr.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)[a-z]*\s+(\d{1,2})(?:,?\s+(\d{4}))?/i);
    if (monthNameMatch) {
      const months: Record<string, number> = {
        jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
        apr: 3, april: 3, may: 4, jun: 5, june: 5,
        jul: 6, july: 6, aug: 7, august: 7, sep: 8, september: 8,
        oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
      };
      const monthName = monthNameMatch[1].toLowerCase();
      const month = months[monthName] ?? months[monthName.substring(0, 3)];
      const day = parseInt(monthNameMatch[2]);
      const year = monthNameMatch[3] ? parseInt(monthNameMatch[3]) : defaultYear;
      
      if (month !== undefined && day) {
        const date = new Date(year, month, day, 19, 0, 0);
        // If date is in the past, assume it's next year
        if (date < now && !monthNameMatch[3]) {
          date.setFullYear(year + 1);
        }
        return date;
      }
    }
    
    // Format 2: "1/15/2026" or "01/15/26"
    const slashMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (slashMatch) {
      const month = parseInt(slashMatch[1]) - 1; // JS months are 0-indexed
      const day = parseInt(slashMatch[2]);
      let year = parseInt(slashMatch[3]);
      if (year < 100) {
        year = year + 2000; // Convert 2-digit to 4-digit
      }
      if (month >= 0 && month < 12 && day > 0 && day <= 31) {
        const date = new Date(year, month, day, 19, 0, 0);
        if (date < now && year === currentYear) {
          date.setFullYear(year + 1);
        }
        return date;
      }
    }
    
    // Format 3: "1-15-2026"
    const dashMatch = dateStr.match(/(\d{1,2})-(\d{1,2})-(\d{2,4})/);
    if (dashMatch) {
      const month = parseInt(dashMatch[1]) - 1;
      const day = parseInt(dashMatch[2]);
      let year = parseInt(dashMatch[3]);
      if (year < 100) {
        year = year + 2000;
      }
      if (month >= 0 && month < 12 && day > 0 && day <= 31) {
        const date = new Date(year, month, day, 19, 0, 0);
        if (date < now && year === currentYear) {
          date.setFullYear(year + 1);
        }
        return date;
      }
    }
    
    // Default: 30 days from now
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    return defaultDate;
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

  private getTimezone(_city: string, state: string): string {
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
