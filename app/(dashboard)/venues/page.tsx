'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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

  if (loading) return <div className="text-center py-8">Loading venues...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Venues</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? 'Cancel' : '+ Add Venue'}
        </button>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

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
