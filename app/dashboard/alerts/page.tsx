'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { formatDateTime } from '@/lib/utils';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';

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

  const fetchAlerts = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const [statusFilter, setStatusFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'createdAt', dir: 'desc' });

  const filteredAndSorted = useMemo(() => {
    let list = [...alerts];
    if (statusFilter) list = list.filter((a) => a.status === statusFilter);
    if (channelFilter) list = list.filter((a) => a.channel === channelFilter);
    list.sort((a, b) => {
      const aVal = sort.key === 'createdAt' ? new Date(a.createdAt).getTime() : (a as unknown as Record<string, unknown>)[sort.key];
      const bVal = sort.key === 'createdAt' ? new Date(b.createdAt).getTime() : (b as unknown as Record<string, unknown>)[sort.key];
      if (typeof aVal === 'number' && typeof bVal === 'number') return sort.dir === 'asc' ? aVal - bVal : bVal - aVal;
      return sort.dir === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });
    return list;
  }, [alerts, statusFilter, channelFilter, sort]);

  const handleDismiss = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/alerts/${id}`, { method: 'PATCH' });
      if (res.ok) fetchAlerts();
    } catch {
      // ignore
    }
  }, [fetchAlerts]);

  const columns: DataTableColumn<Alert>[] = useMemo(
    () => [
      { id: 'message', header: 'Message', accessor: (r) => r.message, render: (_, r) => <span className="font-semibold">{r.message}</span> },
      { id: 'channel', header: 'Channel', accessor: (r) => r.channel, render: (_, r) => <span className="badge badge-blue">{r.channel}</span> },
      { id: 'status', header: 'Status', accessor: (r) => r.status, render: (_, r) => <span className={r.status === 'PENDING' ? 'badge badge-yellow' : r.status === 'SENT' ? 'badge badge-green' : 'badge badge-red'}>{r.status}</span> },
      { id: 'createdAt', header: 'Created', accessor: (r) => r.createdAt, sortKey: 'createdAt', render: (_, r) => formatDateTime(r.createdAt, false) },
      { id: 'sentAt', header: 'Sent', accessor: (r) => r.sentAt, render: (_, r) => (r.sentAt ? formatDateTime(r.sentAt, true) : '—') },
      { id: 'actions', header: '', accessor: () => null, render: (_, r) => r.status === 'PENDING' ? <button type="button" className="btn btn-sm btn-secondary" onClick={() => handleDismiss(r.id)}>Dismiss</button> : null },
    ],
    [handleDismiss]
  );

  const pendingCount = alerts.filter((a) => a.status === 'PENDING').length;
  const sentCount = alerts.filter((a) => a.status === 'SENT').length;

  if (loading) return <div className="text-center py-8">Loading alerts…</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>

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

      <div className="card">
        <div className="card-body">
          <DataTable
            columns={columns}
            data={filteredAndSorted}
            keyExtractor={(r) => r.id}
            sort={sort}
            onSort={(key, dir) => setSort({ key, dir })}
            filterSlot={
              <>
                <select className="input input-sm w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="SENT">Sent</option>
                  <option value="FAILED">Failed</option>
                  <option value="DISMISSED">Dismissed</option>
                </select>
                <select className="input input-sm w-auto" value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}>
                  <option value="">All channels</option>
                  <option value="INAPP">In-app</option>
                  <option value="EMAIL">Email</option>
                  <option value="SMS">SMS</option>
                  <option value="TELEGRAM">Telegram</option>
                </select>
              </>
            }
            emptyMessage="No alerts yet."
          />
        </div>
      </div>
    </div>
  );
}
