'use client';

import { useEffect, useState, useCallback } from 'react';
import { formatDateTime } from '@/lib/utils';

interface Venue {
  id: string;
  name: string;
  city: string;
}

interface Event {
  id: string;
  name: string;
  category: string;
  startTime: string;
  endTime: string | null;
  status: string;
  venue: Venue;
  createdAt: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    venueId: '',
    name: '',
    category: 'Sports',
    startTime: '',
    endTime: '',
  });

  const fetchData = useCallback(async () => {
    try {
      const [eventsRes, venuesRes] = await Promise.all([
        fetch('/api/events'),
        fetch('/api/venues'),
      ]);
      if (!eventsRes.ok || !venuesRes.ok) throw new Error('Failed to fetch');
      const [eventsData, venuesData] = await Promise.all([
        eventsRes.json(),
        venuesRes.json(),
      ]);
      setEvents(eventsData);
      setVenues(venuesData);
      if (venuesData.length > 0 && !formData.venueId) {
        setFormData(prev => ({ ...prev, venueId: venuesData[0].id }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [formData.venueId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to create event');
      setFormData({ venueId: venues[0]?.id || '', name: '', category: 'Sports', startTime: '', endTime: '' });
      setShowForm(false);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  const [discoverQuery, setDiscoverQuery] = useState('');
  const [discoverResults, setDiscoverResults] = useState<{ title: string; link: string; snippet: string }[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [discoverHint, setDiscoverHint] = useState<string | null>(null);
  const [showDiscover, setShowDiscover] = useState(false);

  async function handleDiscover() {
    if (!discoverQuery.trim()) return;
    setDiscoverLoading(true);
    setDiscoverError(null);
    setDiscoverHint(null);
    try {
      const res = await fetch(`/api/discover?q=${encodeURIComponent(discoverQuery.trim())}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDiscoverHint(data.hint || null);
        throw new Error(data.error || 'Discovery failed');
      }
      setDiscoverResults(data.results || []);
    } catch (err) {
      setDiscoverError(err instanceof Error ? err.message : 'Unknown error');
      setDiscoverResults([]);
    } finally {
      setDiscoverLoading(false);
    }
  }

  if (loading) return <div className="text-center py-8">Loading events...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Events</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowDiscover(!showDiscover)} className="btn btn-secondary">
            {showDiscover ? 'Hide discover' : 'Discover events'}
          </button>
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
            {showForm ? 'Cancel' : '+ Add Event'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {showDiscover && (
        <div className="card mb-6">
          <div className="card-header">
            <h2 className="font-semibold">Discover events (SerpApi)</h2>
            <p className="text-sm text-gray-500 mt-1">
              Search for events or parking at a venue, then add the event manually from the results.
            </p>
          </div>
          <div className="card-body space-y-4">
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="e.g. SoFi Stadium events March 2026"
                value={discoverQuery}
                onChange={e => setDiscoverQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleDiscover())}
              />
              <button
                type="button"
                onClick={handleDiscover}
                disabled={discoverLoading || !discoverQuery.trim()}
                className="btn btn-primary"
              >
                {discoverLoading ? 'Searching…' : 'Search'}
              </button>
            </div>
            {discoverError && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded text-sm space-y-1">
                <p>{discoverError}</p>
                {discoverHint && <p className="text-amber-700">{discoverHint}</p>}
              </div>
            )}
            {discoverResults.length > 0 && (
              <ul className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
                {discoverResults.map((r, i) => (
                  <li key={i} className="py-2">
                    <a
                      href={r.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {r.title}
                    </a>
                    {r.snippet && <p className="text-sm text-gray-600 mt-0.5">{r.snippet}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {showForm && (
        <div className="card mb-6">
          <div className="card-header">
            <h2 className="font-semibold">Create New Event</h2>
          </div>
          <form onSubmit={handleSubmit} className="card-body space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <select
                className="input"
                value={formData.venueId}
                onChange={e => setFormData({ ...formData, venueId: e.target.value })}
                required
              >
                <option value="">Select Venue</option>
                {venues.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <input
                className="input"
                placeholder="Event Name"
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <input
                className="input"
                placeholder="Category"
                type="text"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
              />
              <select
                className="input"
                value={formData.startTime}
                onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                required
              >
                <option value="">Start Date/Time</option>
                {Array.from({ length: 30 }).map((_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() + i);
                  return (
                    <option key={i} value={d.toISOString()}>
                      {formatDateTime(d, false)}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button type="submit" className="btn btn-primary">
                Create Event
              </button>
            </div>
          </form>
        </div>
      )}

      {events.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-8">
            <p className="text-gray-600">No events yet. Create one to get started!</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body">
            <table className="table">
              <thead>
                <tr>
                  <th>Event Name</th>
                  <th>Category</th>
                  <th>Venue</th>
                  <th>Start Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {events.map(event => (
                  <tr key={event.id}>
                    <td className="font-semibold">{event.name}</td>
                    <td>{event.category}</td>
                    <td>{event.venue.name}</td>
                    <td className="text-sm text-gray-600">
                      {formatDateTime(event.startTime, false)}
                    </td>
                    <td>
                      <span className={`badge ${event.status === 'UPCOMING' ? 'badge-yellow' : 'badge-blue'}`}>
                        {event.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
