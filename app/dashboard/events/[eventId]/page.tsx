'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatPrice, formatDateTime } from '@/lib/utils';
import { Toast } from '@/components/ui/Toast';

interface Observation {
  id: string;
  normalizedPrice: string;
  rawPriceText: string;
  pageUrl: string;
  observedAt: string;
}

interface ParkingProductRow {
  id: string;
  productName: string;
  lotName: string | null;
  sourceUrl: string;
  sourceName?: string;
  latestObservation: Observation | null;
}

interface OpportunityRow {
  id: string;
  opportunityScore: number;
  confidenceScore: number;
  estimatedBuyPrice: string | null;
  estimatedSellPrice: string | null;
  projectedProfit: string | null;
  manualNotes: string | null;
  status: string;
}

interface EventDetail {
  id: string;
  name: string;
  category: string;
  startTime: string;
  status: string;
  sourceUrl: string | null;
  venue: { id: string; name: string; city: string; state: string };
  parkingProducts: ParkingProductRow[];
  opportunities: OpportunityRow[];
}

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params?.eventId as string;
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [findParkingLoading, setFindParkingLoading] = useState(false);
  const [rationaleLoading, setRationaleLoading] = useState<string | null>(null);

  const fetchEvent = useCallback(async () => {
    if (!eventId) return;
    try {
      const res = await fetch(`/api/events/${eventId}`);
      if (!res.ok) {
        if (res.status === 404) setError('Event not found');
        else setError('Failed to load event');
        setEvent(null);
        return;
      }
      const data = await res.json();
      setEvent(data);
      setError(null);
    } catch {
      setError('Failed to load event');
      setEvent(null);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  async function handleFindParking() {
    setFindParkingLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ingest/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Ingestion failed');
      }
      setSuccessMessage('Parking search running. Refresh in a moment.');
      await fetchEvent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find parking');
    } finally {
      setFindParkingLoading(false);
    }
  }

  async function handleGenerateRationale(oppId: string) {
    setRationaleLoading(oppId);
    setError(null);
    try {
      const res = await fetch(`/api/opportunities/${oppId}/rationale`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to generate');
      const data = await res.json();
      if (event && data.rationale) {
        setEvent({
          ...event,
          opportunities: event.opportunities.map((o) =>
            o.id === oppId ? { ...o, manualNotes: data.rationale } : o
          ),
        });
      }
    } catch {
      setError('Failed to generate AI summary');
    } finally {
      setRationaleLoading(null);
    }
  }

  if (loading) return <div className="text-center py-8">Loading event…</div>;
  if (!event) return <div className="space-y-4"><p className="text-red-600">{error}</p><Link href="/dashboard/events" className="btn btn-secondary">Back to events</Link></div>;

  const hasParking = event.parkingProducts.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/dashboard/events" className="btn btn-secondary">← Events</Link>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>}
      {successMessage && <Toast message={successMessage} onDismiss={() => setSuccessMessage('')} />}

      <div className="card">
        <div className="card-header">
          <h1 className="text-xl font-bold text-gray-900">{event.name}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {event.venue.name} · {event.venue.city}, {event.venue.state}
          </p>
          <p className="text-sm text-gray-600">
            {formatDateTime(event.startTime, false)} · {event.category} · {event.status}
          </p>
          {event.sourceUrl && (
            <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline mt-1 inline-block">
              Source link
            </a>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header flex flex-row items-center justify-between">
          <h2 className="font-semibold">Parking options</h2>
          {!hasParking && (
            <button
              type="button"
              onClick={handleFindParking}
              disabled={findParkingLoading}
              className="btn btn-primary btn-sm"
            >
              {findParkingLoading ? 'Searching…' : 'Find parking'}
            </button>
          )}
        </div>
        <div className="card-body">
          {hasParking ? (
            <ul className="space-y-2">
              {event.parkingProducts.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-2 bg-gray-50 rounded">
                  <div>
                    <span className="font-medium">{p.productName}</span>
                    {p.lotName && <span className="text-gray-500 text-sm ml-2">{p.lotName}</span>}
                    {p.latestObservation && (
                      <p className="text-sm text-gray-600 mt-0.5">
                        {p.latestObservation.rawPriceText} · {formatDateTime(p.latestObservation.observedAt, false)}
                      </p>
                    )}
                  </div>
                  {p.sourceUrl && (
                    <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary">
                      View
                    </a>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">No parking data yet. Click &quot;Find parking&quot; to search.</p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold">Opportunities</h2>
        </div>
        <div className="card-body">
          {event.opportunities.length === 0 ? (
            <p className="text-gray-500 text-sm">No opportunities yet. Find parking first, or add observations manually.</p>
          ) : (
            <ul className="space-y-3">
              {event.opportunities.map((o) => (
                <li key={o.id} className="p-3 bg-gray-50 rounded border border-gray-100">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">Score {o.opportunityScore}</span>
                    <span className="text-sm text-gray-500">Confidence {o.confidenceScore}%</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Buy {o.estimatedBuyPrice != null ? formatPrice(Number(o.estimatedBuyPrice)) : '—'} → Sell {o.estimatedSellPrice != null ? formatPrice(Number(o.estimatedSellPrice)) : '—'} · Profit {o.projectedProfit != null ? formatPrice(Number(o.projectedProfit)) : '—'}
                  </div>
                  {o.manualNotes ? (
                    <p className="text-sm text-gray-700 mt-2 italic">&quot;{o.manualNotes}&quot;</p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleGenerateRationale(o.id)}
                      disabled={rationaleLoading !== null}
                      className="btn btn-sm btn-secondary mt-2"
                    >
                      {rationaleLoading === o.id ? 'Generating…' : 'Generate AI summary'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
