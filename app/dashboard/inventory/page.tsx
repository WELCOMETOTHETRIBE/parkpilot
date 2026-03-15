'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { formatPrice, formatDateTime } from '@/lib/utils';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { Toast } from '@/components/ui/Toast';

interface Event {
  id: string;
  name: string;
  venue: { name: string };
  parkingProducts: { id: string; productName: string }[];
}

interface InventoryItem {
  id: string;
  eventId: string;
  quantity: number;
  acquiredPrice: string;
  source: string;
  status: string;
  acquiredAt: string;
  event: {
    name: string;
    startTime: string;
  };
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    eventId: '',
    parkingProductId: '',
    acquiredAt: new Date().toISOString().slice(0, 16),
    acquiredPrice: '',
    quantity: 1,
    source: 'direct',
    notes: '',
  });

  const fetchInventory = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory');
      if (!res.ok) throw new Error('Failed to fetch inventory');
      const data = await res.json();
      setInventory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  useEffect(() => {
    fetch('/api/events')
      .then(r => r.ok && r.json())
      .then(data => data && setEvents(data))
      .catch(() => {});
  }, []);

  async function handleAddInventory(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const price = parseFloat(formData.acquiredPrice);
    if (isNaN(price) || price <= 0) {
      setError('Enter a valid acquired price');
      return;
    }
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: formData.eventId,
          parkingProductId: formData.parkingProductId || undefined,
          acquiredAt: new Date(formData.acquiredAt).toISOString(),
          acquiredPrice: price,
          quantity: formData.quantity,
          source: formData.source,
          notes: formData.notes || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to add inventory');
      }
      setFormData({
        eventId: events[0]?.id ?? '',
        parkingProductId: '',
        acquiredAt: new Date().toISOString().slice(0, 16),
        acquiredPrice: '',
        quantity: 1,
        source: 'direct',
        notes: '',
      });
      setShowForm(false);
      setSuccessMessage('Inventory added.');
      await fetchInventory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'acquiredAt', dir: 'desc' });
  const [successMessage, setSuccessMessage] = useState('');

  const heldInventory = useMemo(() => inventory.filter((i) => i.status === 'HELD'), [inventory]);
  const totalValue = heldInventory.reduce((sum, i) => sum + Number(i.acquiredPrice) * i.quantity, 0);
  const selectedEvent = events.find((e) => e.id === formData.eventId);
  const productsForEvent = selectedEvent?.parkingProducts ?? [];

  const filteredAndSorted = useMemo(() => {
    let list = statusFilter ? inventory.filter((i) => i.status === statusFilter) : [...inventory];
    list.sort((a, b) => {
      const aVal = sort.key === 'acquiredAt' ? new Date(a.acquiredAt).getTime() : (a as unknown as Record<string, unknown>)[sort.key];
      const bVal = sort.key === 'acquiredAt' ? new Date(b.acquiredAt).getTime() : (b as unknown as Record<string, unknown>)[sort.key];
      if (typeof aVal === 'number' && typeof bVal === 'number') return sort.dir === 'asc' ? aVal - bVal : bVal - aVal;
      return sort.dir === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });
    return list;
  }, [inventory, statusFilter, sort]);

  const columns: DataTableColumn<InventoryItem>[] = useMemo(
    () => [
      { id: 'event', header: 'Event', accessor: (r) => r.event?.name, sortKey: 'event', render: (_, r) => <span className="font-semibold">{r.event?.name}</span> },
      { id: 'quantity', header: 'Qty', accessor: (r) => r.quantity, sortKey: 'quantity' },
      { id: 'acquiredPrice', header: 'Price', accessor: (r) => r.acquiredPrice, render: (_, r) => formatPrice(Number(r.acquiredPrice)) },
      { id: 'total', header: 'Total', accessor: (r) => Number(r.acquiredPrice) * r.quantity, render: (_, r) => formatPrice(Number(r.acquiredPrice) * r.quantity) },
      { id: 'source', header: 'Source', accessor: (r) => r.source },
      { id: 'acquiredAt', header: 'Acquired', accessor: (r) => r.acquiredAt, sortKey: 'acquiredAt', render: (_, r) => formatDateTime(r.acquiredAt, false) },
      { id: 'status', header: 'Status', accessor: (r) => r.status, render: (_, r) => <span className={r.status === 'HELD' ? 'badge badge-yellow' : 'badge badge-green'}>{r.status}</span> },
    ],
    []
  );

  if (loading) return <div className="text-center py-8">Loading inventory…</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <button type="button" onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? 'Cancel' : '+ Add Inventory'}
        </button>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>}
      {successMessage && <Toast message={successMessage} onDismiss={() => setSuccessMessage('')} />}

      {showForm && (
        <div className="card mb-6">
          <div className="card-header">
            <h2 className="font-semibold">Record acquisition</h2>
            <p className="text-sm text-gray-500 mt-1">Log passes you’ve purchased so you can track and record sales.</p>
          </div>
          <form onSubmit={handleAddInventory} className="card-body space-y-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Product (optional)</label>
                <select
                  className="input"
                  value={formData.parkingProductId}
                  onChange={e => setFormData({ ...formData, parkingProductId: e.target.value })}
                >
                  <option value="">— None —</option>
                  {productsForEvent.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.productName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Acquired at</label>
                <input
                  type="datetime-local"
                  className="input"
                  value={formData.acquiredAt}
                  onChange={e => setFormData({ ...formData, acquiredAt: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price per pass *</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="35.00"
                  value={formData.acquiredPrice}
                  onChange={e => setFormData({ ...formData, acquiredPrice: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value, 10) || 1 })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <select
                  className="input"
                  value={formData.source}
                  onChange={e => setFormData({ ...formData, source: e.target.value })}
                >
                  <option value="direct">Direct</option>
                  <option value="partner">Partner</option>
                  <option value="wholesale">Wholesale</option>
                  <option value="marketplace">Marketplace</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <input
                  className="input"
                  placeholder="Order ref, notes..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Add inventory
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="card-body">
            <p className="text-gray-600 text-sm">Held Inventory</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {heldInventory.reduce((sum, i) => sum + i.quantity, 0)}
            </p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-gray-600 text-sm">Total Value Invested</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{formatPrice(totalValue)}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-gray-600 text-sm">Total Items</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{inventory.length}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <DataTable
            columns={columns}
            data={filteredAndSorted}
            keyExtractor={(r) => r.id}
            sort={sort}
            onSort={(key, dir) => setSort({ key, dir })}
            filterSlot={
              <select className="input input-sm w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All statuses</option>
                <option value="HELD">Held</option>
                <option value="LISTED">Listed</option>
                <option value="SOLD">Sold</option>
                <option value="EXPIRED">Expired</option>
                <option value="CANCELED">Canceled</option>
              </select>
            }
            emptyMessage="No inventory items yet."
          />
        </div>
      </div>
    </div>
  );
}
