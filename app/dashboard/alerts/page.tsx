'use client';

import { useEffect, useState } from 'react';
import { formatDateTime } from '@/lib/utils';

interface Alert {
  id: string;
  channel: string;
  message: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
  event?: {
    name: string;
  };
  opportunity?: {
    opportunityScore: number;
  };
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAlerts();
  }, []);

  async function fetchAlerts() {
    try {
      const res = await fetch('/api/alerts');
      if (!res.ok) throw new Error('Failed to fetch alerts');
      const data = await res.json();
      setAlerts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="text-center py-8">Loading alerts...</div>;

  const pendingCount = alerts.filter(a => a.status === 'PENDING').length;
  const sentCount = alerts.filter(a => a.status === 'SENT').length;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Alerts</h1>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="card-body">
            <p className="text-gray-600 text-sm">Total Alerts</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{alerts.length}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-gray-600 text-sm">Pending</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">{pendingCount}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-gray-600 text-sm">Sent</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{sentCount}</p>
          </div>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-8">
            <p className="text-gray-600">No alerts yet</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body">
            <table className="table">
              <thead>
                <tr>
                  <th>Message</th>
                  <th>Channel</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Sent</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map(alert => (
                  <tr key={alert.id}>
                    <td className="font-semibold">{alert.message}</td>
                    <td>
                      <span className="badge badge-blue">{alert.channel}</span>
                    </td>
                    <td>
                      <span className={`badge ${
                        alert.status === 'PENDING' ? 'badge-yellow' :
                        alert.status === 'SENT' ? 'badge-green' :
                        'badge-red'
                      }`}>
                        {alert.status}
                      </span>
                    </td>
                    <td className="text-sm text-gray-600">
                      {formatDateTime(alert.createdAt, false)}
                    </td>
                    <td className="text-sm text-gray-600">
                      {alert.sentAt ? formatDateTime(alert.sentAt, true) : '—'}
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
