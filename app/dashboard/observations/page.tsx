'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { formatPrice, formatDateTime } from '@/lib/utils';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { Toast } from '@/components/ui/Toast';

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

  const [eventFilter, setEventFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'observedAt', dir: 'desc' });
  const [successMessage, setSuccessMessage] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const obsParams = new URLSearchParams();
      if (eventFilter) obsParams.set('eventId', eventFilter);
      if (sourceFilter) obsParams.set('sourceId', sourceFilter);
      obsParams.set('limit', '100');
      const [obsRes, eventsRes, sourcesRes] = await Promise.all([
        fetch(`/api/observations?${obsParams.toString()}`),
        fetch('/api/events'),
        fetch('/api/sources'),
      ]);
      if (!obsRes.ok || !eventsRes.ok || !sourcesRes.ok) throw new Error('Failed to fetch');
      const [obsJson, eventsData, sourcesData] = await Promise.all([
        obsRes.json(),
        eventsRes.json(),
        sourcesRes.json(),
      ]);
      setObservations(obsJson.data ?? []);
      setEvents(eventsData);
      setSources(sourcesData);
      if (eventsData.length > 0 && !formData.eventId) {
        setFormData((prev) => ({ ...prev, eventId: eventsData[0].id }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [formData.eventId, eventFilter, sourceFilter]);

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
      setFormData((prev) => ({ ...prev, rawPriceText: '', normalizedPrice: '', pageUrl: '', availabilityText: '' }));
      setShowForm(false);
      setSuccessMessage('Observation added. Opportunities updated.');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  const sortedObservations = useMemo(() => {
    const list = [...observations];
    list.sort((a, b) => {
      const aVal = sort.key === 'observedAt' ? new Date(a.observedAt).getTime() : (a as unknown as Record<string, unknown>)[sort.key];
      const bVal = sort.key === 'observedAt' ? new Date(b.observedAt).getTime() : (b as unknown as Record<string, unknown>)[sort.key];
      if (typeof aVal === 'number' && typeof bVal === 'number') return sort.dir === 'asc' ? aVal - bVal : bVal - aVal;
      const aStr = String(aVal ?? '');
      const bStr = String(bVal ?? '');
      return sort.dir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
    return list;
  }, [observations, sort]);

  const columns: DataTableColumn<Observation>[] = useMemo(
    () => [
      { id: 'event', header: 'Event', accessor: (r) => r.event?.name, sortKey: 'event', render: (_, r) => <span className="font-semibold">{r.event?.name}</span> },
      { id: 'source', header: 'Source', accessor: (r) => r.source?.name, sortKey: 'source' },
      { id: 'price', header: 'Price', accessor: (r) => r.normalizedPrice, render: (_, r) => formatPrice(Number(r.normalizedPrice)) },
      { id: 'observedAt', header: 'Observed', accessor: (r) => r.observedAt, sortKey: 'observedAt', render: (_, r) => formatDateTime(r.observedAt, false) },
      { id: 'method', header: 'Method', accessor: (r) => r.extractionMethod, render: (_, r) => <span className="badge badge-blue">{r.extractionMethod}</span> },
    ],
    []
  );

  if (loading) return <div className="text-center py-8">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Market Observations</h1>
        <button type="button" onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? 'Cancel' : '+ Add Observation'}
        </button>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>}
      {successMessage && <Toast message={successMessage} onDismiss={() => setSuccessMessage('')} />}

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

      <div className="card">
        <div className="card-body">
          <DataTable
            columns={columns}
            data={sortedObservations}
            keyExtractor={(r) => r.id}
            sort={sort}
            onSort={(key, dir) => setSort({ key, dir })}
            filterSlot={
              <>
                <select className="input input-sm w-auto" value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
                  <option value="">All events</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                  ))}
                </select>
                <select className="input input-sm w-auto" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
                  <option value="">All sources</option>
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </>
            }
            emptyMessage="No observations yet. Add one to start scoring opportunities."
          />
        </div>
      </div>
    </div>
  );
}
