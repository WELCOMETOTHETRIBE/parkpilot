'use client';

import { useEffect, useState, useCallback } from 'react';
import { formatPrice, formatDateTime } from '@/lib/utils';

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
      await fetchInventory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  if (loading) return <div className="text-center py-8">Loading inventory...</div>;

  const heldInventory = inventory.filter(i => i.status === 'HELD');
  const totalValue = heldInventory.reduce((sum, i) => sum + (Number(i.acquiredPrice) * i.quantity), 0);
  const selectedEvent = events.find(e => e.id === formData.eventId);
  const productsForEvent = selectedEvent?.parkingProducts ?? [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Inventory</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? 'Cancel' : '+ Add Inventory'}
        </button>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

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

      {inventory.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-8">
            <p className="text-gray-600">No inventory items yet</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body">
            <table className="table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Quantity</th>
                  <th>Acquired Price</th>
                  <th>Total Value</th>
                  <th>Source</th>
                  <th>Acquired Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map(item => (
                  <tr key={item.id}>
                    <td className="font-semibold">{item.event.name}</td>
                    <td>{item.quantity}</td>
                    <td>{formatPrice(Number(item.acquiredPrice))}</td>
                    <td className="font-semibold">
                      {formatPrice(Number(item.acquiredPrice) * item.quantity)}
                    </td>
                    <td className="text-sm text-gray-600 capitalize">{item.source}</td>
                    <td className="text-sm text-gray-600">
                      {formatDateTime(item.acquiredAt, false)}
                    </td>
                    <td>
                      <span className={`badge ${item.status === 'HELD' ? 'badge-yellow' : 'badge-green'}`}>
                        {item.status}
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
