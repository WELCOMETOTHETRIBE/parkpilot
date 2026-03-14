'use client';

import { useEffect, useState, useCallback } from 'react';
import { formatPrice, formatDateTime } from '@/lib/utils';

interface Source {
  id: string;
  name: string;
  type: string;
  baseUrl: string;
}

interface ParkingProduct {
  id: string;
  productName: string;
  sourceId: string;
  source: Source;
}

interface Event {
  id: string;
  name: string;
  startTime: string;
  venue: { name: string };
  parkingProducts: ParkingProduct[];
}

interface Observation {
  id: string;
  eventId: string;
  observedAt: string;
  rawPriceText: string;
  normalizedPrice: string;
  pageUrl: string;
  extractionMethod: string;
  event: { name: string };
  source: { name: string };
}

export default function ObservationsPage() {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    eventId: '',
    sourceId: '',
    parkingProductId: '',
    observedAt: new Date().toISOString().slice(0, 16),
    rawPriceText: '',
    normalizedPrice: '',
    pageUrl: '',
    extractionMethod: 'MANUAL' as 'API' | 'SELENIUM' | 'MANUAL',
    availabilityText: '',
    transferabilityStatus: 'UNKNOWN' as 'UNKNOWN' | 'YES' | 'NO',
  });

  const fetchData = useCallback(async () => {
    try {
      const [obsRes, eventsRes, sourcesRes] = await Promise.all([
        fetch('/api/observations'),
        fetch('/api/events'),
        fetch('/api/sources'),
      ]);
      if (!obsRes.ok || !eventsRes.ok || !sourcesRes.ok) throw new Error('Failed to fetch');
      const [obsData, eventsData, sourcesData] = await Promise.all([
        obsRes.json(),
        eventsRes.json(),
        sourcesRes.json(),
      ]);
      setObservations(obsData);
      setEvents(eventsData);
      setSources(sourcesData);
      if (eventsData.length > 0 && !formData.eventId) {
        setFormData(prev => ({ ...prev, eventId: eventsData[0].id }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [formData.eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedEvent = events.find(e => e.id === formData.eventId);
  const productsForEvent = selectedEvent?.parkingProducts ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const price = parseFloat(formData.normalizedPrice);
    if (isNaN(price) || price <= 0) {
      setError('Enter a valid price');
      return;
    }
    try {
      const res = await fetch('/api/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: formData.eventId,
          sourceId: formData.sourceId,
          parkingProductId: formData.parkingProductId || undefined,
          observedAt: new Date(formData.observedAt).toISOString(),
          rawPriceText: formData.rawPriceText || `$${formData.normalizedPrice}`,
          normalizedPrice: price,
          pageUrl: formData.pageUrl || 'https://manual.local',
          extractionMethod: formData.extractionMethod,
          transferabilityStatus: formData.transferabilityStatus,
          availabilityText: formData.availabilityText || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to add observation');
      }
      setFormData(prev => ({
        ...prev,
        rawPriceText: '',
        normalizedPrice: '',
        pageUrl: '',
        availabilityText: '',
      }));
      setShowForm(false);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Market Observations</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? 'Cancel' : '+ Add Observation'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>
      )}

      {showForm && (
        <div className="card mb-6">
          <div className="card-header">
            <h2 className="font-semibold">Log a price observation</h2>
            <p className="text-sm text-gray-500 mt-1">
              New observations create or update scored opportunities automatically.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="card-body space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event</label>
                <select
                  className="input"
                  value={formData.eventId}
                  onChange={e => setFormData({ ...formData, eventId: e.target.value, parkingProductId: '' })}
                  required
                >
                  <option value="">Select event</option>
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name} · {ev.venue.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <select
                  className="input"
                  value={formData.sourceId}
                  onChange={e => setFormData({ ...formData, sourceId: e.target.value })}
                  required
                >
                  <option value="">Select source</option>
                  {sources.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.type})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parking product (optional)</label>
                <select
                  className="input"
                  value={formData.parkingProductId}
                  onChange={e => setFormData({ ...formData, parkingProductId: e.target.value })}
                >
                  <option value="">— None —</option>
                  {productsForEvent
                    .filter(p => p.sourceId === formData.sourceId)
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.productName}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observed at</label>
                <input
                  type="datetime-local"
                  className="input"
                  value={formData.observedAt}
                  onChange={e => setFormData({ ...formData, observedAt: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (raw text)</label>
                <input
                  className="input"
                  placeholder="$45.99"
                  value={formData.rawPriceText}
                  onChange={e => setFormData({ ...formData, rawPriceText: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (number) *</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="45.99"
                  value={formData.normalizedPrice}
                  onChange={e => setFormData({ ...formData, normalizedPrice: e.target.value })}
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Page URL</label>
                <input
                  className="input"
                  type="url"
                  placeholder="https://..."
                  value={formData.pageUrl}
                  onChange={e => setFormData({ ...formData, pageUrl: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                <select
                  className="input"
                  value={formData.extractionMethod}
                  onChange={e =>
                    setFormData({ ...formData, extractionMethod: e.target.value as 'API' | 'SELENIUM' | 'MANUAL' })
                  }
                >
                  <option value="MANUAL">Manual</option>
                  <option value="API">API</option>
                  <option value="SELENIUM">Selenium</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transferability</label>
                <select
                  className="input"
                  value={formData.transferabilityStatus}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      transferabilityStatus: e.target.value as 'UNKNOWN' | 'YES' | 'NO',
                    })
                  }
                >
                  <option value="UNKNOWN">Unknown</option>
                  <option value="YES">Yes</option>
                  <option value="NO">No</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Availability (optional)</label>
                <input
                  className="input"
                  placeholder="24 spots left"
                  value={formData.availabilityText}
                  onChange={e => setFormData({ ...formData, availabilityText: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Add observation
              </button>
            </div>
          </form>
        </div>
      )}

      {observations.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-8">
            <p className="text-gray-600">No observations yet. Add one to start scoring opportunities.</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body">
            <table className="table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Source</th>
                  <th>Price</th>
                  <th>Observed</th>
                  <th>Method</th>
                </tr>
              </thead>
              <tbody>
                {observations.map(obs => (
                  <tr key={obs.id}>
                    <td className="font-semibold">{obs.event.name}</td>
                    <td className="text-sm text-gray-600">{obs.source.name}</td>
                    <td>{formatPrice(Number(obs.normalizedPrice))}</td>
                    <td className="text-sm text-gray-600">{formatDateTime(obs.observedAt, false)}</td>
                    <td>
                      <span className="badge badge-blue">{obs.extractionMethod}</span>
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
