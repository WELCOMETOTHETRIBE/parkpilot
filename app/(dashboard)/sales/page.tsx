'use client';

import { useEffect, useState } from 'react';
import { formatPrice, formatDateTime } from '@/lib/utils';

interface Sale {
  id: string;
  soldAt: string;
  soldPrice: string;
  fees: string;
  netProfit: string;
  saleChannel: string;
  inventoryItem: {
    event: {
      name: string;
    };
  };
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSales();
  }, []);

  async function fetchSales() {
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
  }

  if (loading) return <div className="text-center py-8">Loading sales...</div>;

  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.soldPrice), 0);
  const totalFees = sales.reduce((sum, s) => sum + Number(s.fees), 0);
  const totalProfit = sales.reduce((sum, s) => sum + Number(s.netProfit), 0);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Sales</h1>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

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
