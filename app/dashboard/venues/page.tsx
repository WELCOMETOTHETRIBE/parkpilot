'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { Toast } from '@/components/ui/Toast';

interface Venue {
  id: string;
  name: string;
  city: string;
  state: string;
  timezone: string;
  createdAt: string;
}

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', city: '', state: '', timezone: 'America/Los_Angeles' });
  const [successMessage, setSuccessMessage] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' });
  const [cityFilter, setCityFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');

  const [showDiscover, setShowDiscover] = useState(false);
  const [discoverCity, setDiscoverCity] = useState('');
  const [discoverState, setDiscoverState] = useState('');
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverResults, setDiscoverResults] = useState<Array<{ name: string; city: string; state: string; sourceUrl: string }>>([]);
  const [discoveringVenue, setDiscoveringVenue] = useState<string | null>(null);

  async function handleDiscoverVenue(venueName: string, city: string, state: string) {
    setDiscoveringVenue(venueName);
    setError(null);
    try {
      const res = await fetch('/api/discover/venue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venueName, city, state }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Discovery failed');
      }
      const data = await res.json();
      setSuccessMessage(`Venue "${data.venue?.name}" created with ${data.eventsCreated ?? 0} events.`);
      await fetchVenues();
      setShowDiscover(false);
      setDiscoverResults([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Discovery failed');
    } finally {
      setDiscoveringVenue(null);
    }
  }

  const fetchVenues = useCallback(async () => {
    try {
      const res = await fetch('/api/venues');
      if (!res.ok) throw new Error('Failed to fetch venues');
      const data = await res.json();
      setVenues(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  const filteredAndSorted = useMemo(() => {
    let list = [...venues];
    if (cityFilter) list = list.filter((v) => v.city.toLowerCase().includes(cityFilter.toLowerCase()));
    if (stateFilter) list = list.filter((v) => v.state === stateFilter);
    list.sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sort.key];
      const bVal = (b as unknown as Record<string, unknown>)[sort.key];
      const aStr = String(aVal ?? '');
      const bStr = String(bVal ?? '');
      return sort.dir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
    return list;
  }, [venues, cityFilter, stateFilter, sort]);

  const columns: DataTableColumn<Venue>[] = useMemo(
    () => [
      { id: 'name', header: 'Name', accessor: (r) => r.name, sortKey: 'name', render: (_, r) => <span className="font-semibold">{r.name}</span> },
      { id: 'city', header: 'City', accessor: (r) => r.city, sortKey: 'city' },
      { id: 'state', header: 'State', accessor: (r) => r.state, sortKey: 'state' },
      { id: 'timezone', header: 'Timezone', accessor: (r) => r.timezone },
      { id: 'createdAt', header: 'Created', accessor: (r) => r.createdAt, sortKey: 'createdAt', render: (_, r) => new Date(r.createdAt).toLocaleDateString() },
      {
        id: 'actions',
        header: 'Actions',
        accessor: () => null,
        render: (_, r) => (
          <button
            type="button"
            onClick={() => handleDiscoverVenue(r.name, r.city, r.state)}
            disabled={discoveringVenue === r.name}
            className="btn btn-sm btn-secondary"
          >
            {discoveringVenue === r.name ? 'Discovering…' : 'Discover Events'}
          </button>
        ),
      },
    ],
    [discoveringVenue]
  );

  const states = useMemo(() => Array.from(new Set(venues.map((v) => v.state))).sort(), [venues]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!formData.state || formData.state.length !== 2) {
      setError('State must be 2 characters (e.g. CA)');
      return;
    }
    try {
      const res = await fetch('/api/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to create venue');
      setFormData({ name: '', city: '', state: '', timezone: 'America/Los_Angeles' });
      setShowForm(false);
      setSuccessMessage('Venue created.');
      await fetchVenues();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  async function handleSearchVenues() {
    if (!discoverCity.trim() || !discoverState.trim()) {
      setError('Enter both city and state');
      return;
    }
    setDiscoverLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/discover/search?city=${encodeURIComponent(discoverCity)}&state=${encodeURIComponent(discoverState)}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setDiscoverResults(data.venues || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setDiscoverResults([]);
    } finally {
      setDiscoverLoading(false);
    }
  }

  if (loading) return <div className="text-center py-8">Loading venues…</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Venues</h1>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setShowDiscover(!showDiscover)} className="btn btn-secondary">
            {showDiscover ? 'Cancel Discovery' : 'Discover Venues'}
          </button>
          <button type="button" onClick={() => setShowForm(!showForm)} className="btn btn-primary">
            {showForm ? 'Cancel' : '+ Add Venue'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>}
      {successMessage && <Toast message={successMessage} onDismiss={() => setSuccessMessage('')} />}

      {showDiscover && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold">Discover Venues (SerpAPI)</h2>
            <p className="text-sm text-gray-500 mt-1">Search by city and state, then discover events and parking.</p>
          </div>
          <div className="card-body space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label">City</label>
                <input className="input" placeholder="e.g. Los Angeles" value={discoverCity} onChange={(e) => setDiscoverCity(e.target.value)} />
              </div>
              <div>
                <label className="label">State (2 letters)</label>
                <input className="input" placeholder="CA" value={discoverState} maxLength={2} onChange={(e) => setDiscoverState(e.target.value.toUpperCase())} />
              </div>
              <div className="flex items-end">
                <button type="button" onClick={handleSearchVenues} disabled={discoverLoading} className="btn btn-primary w-full sm:w-auto">
                  {discoverLoading ? 'Searching…' : 'Search Venues'}
                </button>
              </div>
            </div>
            {discoverResults.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Found {discoverResults.length} venues</h3>
                <div className="space-y-2">
                  {discoverResults.map((venue, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-semibold">{venue.name}</p>
                        <p className="text-sm text-gray-600">{venue.city}, {venue.state}</p>
                      </div>
                      <button type="button" onClick={() => handleDiscoverVenue(venue.name, venue.city, venue.state)} disabled={discoveringVenue === venue.name} className="btn btn-sm btn-primary">
                        {discoveringVenue === venue.name ? 'Discovering…' : 'Discover Events & Parking'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showForm && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold">Create New Venue</h2>
          </div>
          <form onSubmit={handleSubmit} className="card-body space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Venue Name *</label>
                <input className="input" placeholder="Venue Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">City *</label>
                <input className="input" placeholder="City" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} required />
              </div>
              <div>
                <label className="label">State (2 letters) *</label>
                <input className="input" placeholder="CA" value={formData.state} maxLength={2} onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })} required />
              </div>
              <div>
                <label className="label">Timezone</label>
                <input className="input" placeholder="America/Los_Angeles" value={formData.timezone} onChange={(e) => setFormData({ ...formData, timezone: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
              <button type="submit" className="btn btn-primary">Create Venue</button>
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
                <input className="input input-sm w-40" placeholder="Filter by city" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} />
                <select className="input input-sm w-auto" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
                  <option value="">All states</option>
                  {states.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </>
            }
            emptyMessage="No venues yet. Add one or use Discover."
          />
        </div>
      </div>
    </div>
  );
}
