'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { formatDateTime } from '@/lib/utils';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { Toast } from '@/components/ui/Toast';

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
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'startTime', dir: 'asc' });
  const [venueFilter, setVenueFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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
        setFormData((prev) => ({ ...prev, venueId: venuesData[0].id }));
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

  const filteredAndSorted = useMemo(() => {
    let list = [...events];
    if (venueFilter) list = list.filter((e) => e.venue.id === venueFilter);
    if (categoryFilter) list = list.filter((e) => e.category === categoryFilter);
    list.sort((a, b) => {
      const aVal = sort.key === 'startTime' ? new Date(a.startTime).getTime() : (a as unknown as Record<string, unknown>)[sort.key];
      const bVal = sort.key === 'startTime' ? new Date(b.startTime).getTime() : (b as unknown as Record<string, unknown>)[sort.key];
      if (typeof aVal === 'number' && typeof bVal === 'number') return sort.dir === 'asc' ? aVal - bVal : bVal - aVal;
      const aStr = String(aVal ?? '');
      const bStr = String(bVal ?? '');
      return sort.dir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
    return list;
  }, [events, venueFilter, categoryFilter, sort]);

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
      setSuccessMessage('Event created.');
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

  const columns: DataTableColumn<Event>[] = useMemo(
    () => [
      { id: 'name', header: 'Event Name', accessor: (r) => r.name, sortKey: 'name', render: (_, r) => <span className="font-semibold">{r.name}</span> },
      { id: 'category', header: 'Category', accessor: (r) => r.category, sortKey: 'category' },
      { id: 'venue', header: 'Venue', accessor: (r) => r.venue?.name },
      { id: 'startTime', header: 'Start', accessor: (r) => r.startTime, sortKey: 'startTime', render: (_, r) => formatDateTime(r.startTime, false) },
      { id: 'status', header: 'Status', accessor: (r) => r.status, render: (_, r) => <span className={r.status === 'UPCOMING' ? 'badge badge-yellow' : 'badge badge-blue'}>{r.status}</span> },
    ],
    []
  );

  const categories = useMemo(() => Array.from(new Set(events.map((e) => e.category))).sort(), [events]);

  if (loading) return <div className="text-center py-8">Loading events…</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setShowDiscover(!showDiscover)} className="btn btn-secondary">
            {showDiscover ? 'Hide discover' : 'Discover events'}
          </button>
          <button type="button" onClick={() => setShowForm(!showForm)} className="btn btn-primary">
            {showForm ? 'Cancel' : '+ Add Event'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>}
      {successMessage && <Toast message={successMessage} onDismiss={() => setSuccessMessage('')} />}

      {showDiscover && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold">Discover events (SerpApi)</h2>
            <p className="text-sm text-gray-500 mt-1">Search for events or parking at a venue.</p>
          </div>
          <div className="card-body space-y-4">
            <div className="flex gap-2 flex-wrap">
              <input
                className="input flex-1 min-w-[200px]"
                placeholder="e.g. SoFi Stadium events March 2026"
                value={discoverQuery}
                onChange={(e) => setDiscoverQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleDiscover())}
              />
              <button type="button" onClick={handleDiscover} disabled={discoverLoading || !discoverQuery.trim()} className="btn btn-primary">
                {discoverLoading ? 'Searching…' : 'Search'}
              </button>
            </div>
            {discoverError && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded text-sm">
                {discoverError}
                {discoverHint && <p className="mt-1 text-amber-700">{discoverHint}</p>}
              </div>
            )}
            {discoverResults.length > 0 && (
              <ul className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
                {discoverResults.map((r, i) => (
                  <li key={i} className="py-2">
                    <a href={r.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
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
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold">Create New Event</h2>
          </div>
          <form onSubmit={handleSubmit} className="card-body space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Venue</label>
                <select
                  className="input"
                  value={formData.venueId}
                  onChange={(e) => setFormData({ ...formData, venueId: e.target.value })}
                  required
                >
                  <option value="">Select Venue</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Event Name</label>
                <input
                  className="input"
                  placeholder="Event Name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Category</label>
                <input
                  className="input"
                  placeholder="Category"
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Start Date/Time</label>
                <select
                  className="input"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  required
                >
                  <option value="">Select</option>
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
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
              <button type="submit" className="btn btn-primary">Create Event</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <DataTable
            columns={columns}
            data={filteredAndSorted}
            keyExtractor={(r) => r.id}
            sort={sort}
            onSort={(key, dir) => setSort({ key, dir })}
            filterSlot={
              <>
                <select className="input input-sm w-auto" value={venueFilter} onChange={(e) => setVenueFilter(e.target.value)}>
                  <option value="">All venues</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
                <select className="input input-sm w-auto" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </>
            }
            emptyMessage="No events. Create one or use Discover."
          />
        </div>
      </div>
    </div>
  );
}
