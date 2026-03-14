'use client';

import { useEffect, useState, useCallback } from 'react';
import { formatPrice, formatDateTime } from '@/lib/utils';

interface Sale {
  id: string;
  soldAt: string;
  soldPrice: string;
  fees: string;
  netProfit: string;
  saleChannel: string;
  inventoryItem: {
    id: string;
    quantity: number;
    acquiredPrice: string;
    event: { name: string };
  };
}

interface InventoryItem {
  id: string;
  quantity: number;
  acquiredPrice: string;
  status: string;
  event: { name: string };
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    inventoryItemId: '',
    soldAt: new Date().toISOString().slice(0, 16),
    soldPrice: '',
    fees: '0',
    saleChannel: 'marketplace',
  });

  const fetchSales = useCallback(async () => {
    try {
      const res = await fetch('/api/sales');
      if (!res.ok) throw new Error('Failed to fetch sales');
      const data = await res.json();
      setSales(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  useEffect(() => {
    fetch('/api/inventory')
      .then(r => r.ok && r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setInventory(data.filter((i: InventoryItem) => i.status === 'HELD' && i.quantity > 0));
        }
      })
      .catch(() => {});
  }, [sales]);

  async function handleRecordSale(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const soldPrice = parseFloat(formData.soldPrice);
    const fees = parseFloat(formData.fees);
    if (isNaN(soldPrice) || soldPrice <= 0 || isNaN(fees) || fees < 0) {
      setError('Enter valid sold price and fees');
      return;
    }
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventoryItemId: formData.inventoryItemId,
          soldAt: new Date(formData.soldAt).toISOString(),
          soldPrice,
          fees,
          saleChannel: formData.saleChannel,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to record sale');
      }
      setFormData({
        inventoryItemId: '',
        soldAt: new Date().toISOString().slice(0, 16),
        soldPrice: '',
        fees: '0',
        saleChannel: 'marketplace',
      });
      setShowForm(false);
      await fetchSales();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  if (loading) return <div className="text-center py-8">Loading sales...</div>;

  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.soldPrice), 0);
  const totalFees = sales.reduce((sum, s) => sum + Number(s.fees), 0);
  const totalProfit = sales.reduce((sum, s) => sum + Number(s.netProfit), 0);
  const selectedItem = inventory.find(i => i.id === formData.inventoryItemId);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Sales</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
          disabled={inventory.length === 0}
        >
          {showForm ? 'Cancel' : '+ Record Sale'}
        </button>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {inventory.length === 0 && !showForm && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded mb-4">
          No held inventory to sell. Add inventory first, then record sales here.
        </div>
      )}

      {showForm && inventory.length > 0 && (
        <div className="card mb-6">
          <div className="card-header">
            <h2 className="font-semibold">Record a sale</h2>
            <p className="text-sm text-gray-500 mt-1">Selling one unit from the selected inventory line. Profit is computed automatically.</p>
          </div>
          <form onSubmit={handleRecordSale} className="card-body space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Inventory line *</label>
                <select
                  className="input"
                  value={formData.inventoryItemId}
                  onChange={e => setFormData({ ...formData, inventoryItemId: e.target.value })}
                  required
                >
                  <option value="">Select inventory</option>
                  {inventory.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.event.name} · {item.quantity} @ {formatPrice(Number(item.acquiredPrice))} each
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sold at</label>
                <input
                  type="datetime-local"
                  className="input"
                  value={formData.soldAt}
                  onChange={e => setFormData({ ...formData, soldAt: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sold price *</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="60.00"
                  value={formData.soldPrice}
                  onChange={e => setFormData({ ...formData, soldPrice: e.target.value })}
                  required
                />
                {selectedItem && (
                  <p className="text-xs text-gray-500 mt-1">
                    Cost basis: {formatPrice(Number(selectedItem.acquiredPrice))} per unit
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fees</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.fees}
                  onChange={e => setFormData({ ...formData, fees: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
                <select
                  className="input"
                  value={formData.saleChannel}
                  onChange={e => setFormData({ ...formData, saleChannel: e.target.value })}
                >
                  <option value="marketplace">Marketplace</option>
                  <option value="direct">Direct</option>
                  <option value="stubhub">StubHub</option>
                  <option value="reseller">Reseller</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Record sale
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card">
          <div className="card-body">
            <p className="text-gray-600 text-sm">Total Sales</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{sales.length}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-gray-600 text-sm">Total Revenue</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{formatPrice(totalRevenue)}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-gray-600 text-sm">Total Fees</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{formatPrice(totalFees)}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-gray-600 text-sm">Total Profit</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{formatPrice(totalProfit)}</p>
          </div>
        </div>
      </div>

      {sales.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-8">
            <p className="text-gray-600">No sales recorded yet</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body">
            <table className="table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Sold Price</th>
                  <th>Fees</th>
                  <th>Net Profit</th>
                  <th>Channel</th>
                  <th>Date Sold</th>
                  <th>Margin %</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(sale => {
                  const margin = Number(sale.netProfit) / Number(sale.soldPrice);
                  return (
                    <tr key={sale.id}>
                      <td className="font-semibold">{sale.inventoryItem.event.name}</td>
                      <td>{formatPrice(Number(sale.soldPrice))}</td>
                      <td>{formatPrice(Number(sale.fees))}</td>
                      <td className="font-semibold text-green-600">
                        {formatPrice(Number(sale.netProfit))}
                      </td>
                      <td className="text-sm text-gray-600 capitalize">{sale.saleChannel}</td>
                      <td className="text-sm text-gray-600">
                        {formatDateTime(sale.soldAt, false)}
                      </td>
                      <td className="font-semibold">{(margin * 100).toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
