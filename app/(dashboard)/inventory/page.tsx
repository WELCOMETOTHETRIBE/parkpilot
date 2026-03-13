'use client';

import { useEffect, useState } from 'react';
import { formatPrice, formatDateTime } from '@/lib/utils';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
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
  }

  if (loading) return <div className="text-center py-8">Loading inventory...</div>;

  const heldInventory = inventory.filter(i => i.status === 'HELD');
  const totalValue = heldInventory.reduce((sum, i) => sum + (Number(i.acquiredPrice) * i.quantity), 0);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Inventory</h1>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

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
