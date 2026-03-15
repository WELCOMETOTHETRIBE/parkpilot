'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Toast } from '@/components/ui/Toast';

interface UpcomingEvent {
  name: string;
  date: string;
  venueName: string;
  city: string;
  state: string;
  category: string;
  sourceUrl: string;
}

export default function UpcomingPage() {
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [useFavorites, setUseFavorites] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [discovering, setDiscovering] = useState<string | null>(null);

  const fetchFavorites = useCallback(async () => {
    try {
      const res = await fetch('/api/profile/favorite-venues');
      if (!res.ok) return;
      const data = await res.json();
      setFavoriteIds(data.venueIds ?? []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  async function handleSearch() {
    if (useFavorites) {
      if (favoriteIds.length === 0) {
        setError('Add favorite venues first on the Venues page.');
        return;
      }
    } else {
      if (!city.trim() || !state.trim()) {
        setError('Enter city and state.');
        return;
      }
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (useFavorites) params.set('venueIds', favoriteIds.join(','));
      else {
        params.set('city', city.trim());
        params.set('state', state.trim().toUpperCase().slice(0, 2));
      }
      params.set('limit', '50');
      const res = await fetch(`/api/upcoming-events?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch events');
      }
      const data = await res.json();
      setEvents(data.events ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddVenueAndFindParking(ev: UpcomingEvent) {
    const key = `${ev.name}-${ev.venueName}`;
    setDiscovering(key);
    setError(null);
    try {
      const res = await fetch('/api/discover/venue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueName: ev.venueName || ev.name,
          city: ev.city,
          state: ev.state?.slice(0, 2) || '',
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Discovery failed');
      }
      const data = await res.json();
      if (data.queued) {
        setSuccessMessage(data.message ?? 'Scanning in background; check Events and Opportunities shortly.');
      } else {
        setSuccessMessage(`Venue added with ${data.eventsCreated ?? 0} events. Check Events and Opportunities.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Discovery failed');
    } finally {
      setDiscovering(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Upcoming Events</h1>
        <Link href="/dashboard/events" className="btn btn-secondary">
          View my events
        </Link>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>}
      {successMessage && <Toast message={successMessage} onDismiss={() => setSuccessMessage('')} />}

      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold">Find upcoming events</h2>
          <p className="text-sm text-gray-500 mt-1">Search by city/state or at your favorite venues. Then add the venue and find parking opportunities.</p>
        </div>
        <div className="card-body space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={useFavorites}
                onChange={(e) => setUseFavorites(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span>At my favorite venues</span>
            </label>
            {!useFavorites && (
              <>
                <div>
                  <label className="label">City</label>
                  <input className="input w-40" placeholder="e.g. Los Angeles" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div>
                  <label className="label">State (2 letters)</label>
                  <input className="input w-20" placeholder="CA" value={state} maxLength={2} onChange={(e) => setState(e.target.value.toUpperCase())} />
                </div>
              </>
            )}
            <button type="button" onClick={handleSearch} disabled={loading} className="btn btn-primary">
              {loading ? 'Searching…' : 'Search events'}
            </button>
          </div>
          {useFavorites && favoriteIds.length === 0 && (
            <p className="text-sm text-amber-700">You have no favorite venues. Add some on the Venues page first.</p>
          )}
        </div>
      </div>

      {events.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold">Found {events.length} events</h2>
          </div>
          <div className="card-body overflow-x-auto">
            <div className="max-h-[60vh] overflow-y-auto space-y-3">
              {events.map((ev, idx) => (
                <div key={idx} className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 rounded border border-gray-100">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{ev.name}</p>
                    <p className="text-sm text-gray-600">
                      {ev.venueName}
                      {ev.city || ev.state ? ` · ${ev.city}${ev.state ? `, ${ev.state}` : ''}` : ''}
                    </p>
                    <p className="text-xs text-gray-500">
                      {ev.date} · {ev.category}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {ev.sourceUrl && (
                      <a href={ev.sourceUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary">
                        Source
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleAddVenueAndFindParking(ev)}
                      disabled={discovering !== null}
                      className="btn btn-sm btn-primary"
                    >
                      {discovering === `${ev.name}-${ev.venueName}` ? 'Discovering…' : 'Add venue & find parking'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && events.length === 0 && (
        <div className="card">
          <div className="card-body text-center text-gray-500 py-8">
            Use the filters above and click &quot;Search events&quot; to find upcoming events.
          </div>
        </div>
      )}
    </div>
  );
}
