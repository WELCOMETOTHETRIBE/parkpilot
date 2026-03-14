'use client';

import { useEffect, useState } from 'react';

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
  
  // Discovery state
  const [showDiscover, setShowDiscover] = useState(false);
  const [discoverCity, setDiscoverCity] = useState('');
  const [discoverState, setDiscoverState] = useState('');
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverResults, setDiscoverResults] = useState<Array<{ name: string; city: string; state: string; sourceUrl: string }>>([]);
  const [discoveringVenue, setDiscoveringVenue] = useState<string | null>(null);

  useEffect(() => {
    fetchVenues();
  }, []);

  async function fetchVenues() {
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
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to create venue');
      setFormData({ name: '', city: '', state: '', timezone: 'America/Los_Angeles' });
      setShowForm(false);
      await fetchVenues();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  async function handleSearchVenues() {
    if (!discoverCity.trim() || !discoverState.trim()) {
      setError('Please enter both city and state');
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
      setError(null);
      alert(`Success! Created venue "${data.venue.name}" with ${data.eventsCreated} events and discovered parking opportunities.`);
      await fetchVenues();
      setShowDiscover(false);
      setDiscoverResults([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Discovery failed');
    } finally {
      setDiscoveringVenue(null);
    }
  }

  if (loading) return <div className="text-center py-8">Loading venues...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Venues</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowDiscover(!showDiscover)} className="btn btn-secondary">
            {showDiscover ? 'Cancel Discovery' : '🔍 Discover Venues'}
          </button>
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
            {showForm ? 'Cancel' : '+ Add Venue'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {showDiscover && (
        <div className="card mb-6">
          <div className="card-header">
            <h2 className="font-semibold">🔍 Discover Venues with SerpAPI</h2>
            <p className="text-sm text-gray-600 mt-1">Search for venues in a city, then discover their events and parking opportunities</p>
          </div>
          <div className="card-body space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <input
                className="input"
                placeholder="City (e.g., Los Angeles)"
                value={discoverCity}
                onChange={e => setDiscoverCity(e.target.value)}
              />
              <input
                className="input"
                placeholder="State (e.g., CA)"
                value={discoverState}
                maxLength={2}
                onChange={e => setDiscoverState(e.target.value.toUpperCase())}
              />
              <button 
                onClick={handleSearchVenues} 
                disabled={discoverLoading}
                className="btn btn-primary"
              >
                {discoverLoading ? 'Searching...' : 'Search Venues'}
              </button>
            </div>
            
            {discoverResults.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Found {discoverResults.length} venues:</h3>
                <div className="space-y-2">
                  {discoverResults.map((venue, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-semibold">{venue.name}</p>
                        <p className="text-sm text-gray-600">{venue.city}, {venue.state}</p>
                      </div>
                      <button
                        onClick={() => handleDiscoverVenue(venue.name, venue.city, venue.state)}
                        disabled={discoveringVenue === venue.name}
                        className="btn btn-sm btn-primary"
                      >
                        {discoveringVenue === venue.name ? 'Discovering...' : 'Discover Events & Parking'}
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
        <div className="card mb-6">
          <div className="card-header">
            <h2 className="font-semibold">Create New Venue</h2>
          </div>
          <form onSubmit={handleSubmit} className="card-body space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                className="input"
                placeholder="Venue Name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <input
                className="input"
                placeholder="City"
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                required
              />
              <input
                className="input"
                placeholder="State (e.g., CA)"
                value={formData.state}
                maxLength={2}
                onChange={e => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                required
              />
              <input
                className="input"
                type="text"
                placeholder="Timezone"
                value={formData.timezone}
                onChange={e => setFormData({ ...formData, timezone: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="submit" className="btn btn-primary">
                Create Venue
              </button>
            </div>
          </form>
        </div>
      )}

      {venues.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-8">
            <p className="text-gray-600">No venues yet. Create one to get started!</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>City</th>
                  <th>State</th>
                  <th>Timezone</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {venues.map(venue => (
                  <tr key={venue.id}>
                    <td className="font-semibold">{venue.name}</td>
                    <td>{venue.city}</td>
                    <td>{venue.state}</td>
                    <td className="text-sm text-gray-600">{venue.timezone}</td>
                    <td className="text-sm text-gray-600">
                      {new Date(venue.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <button
                        onClick={() => handleDiscoverVenue(venue.name, venue.city, venue.state)}
                        disabled={discoveringVenue === venue.name}
                        className="btn btn-sm btn-secondary"
                      >
                        {discoveringVenue === venue.name ? 'Discovering...' : '🔍 Discover Events'}
                      </button>
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
