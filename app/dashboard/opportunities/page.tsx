'use client';

import { useEffect, useState, useCallback } from 'react';
import { formatPrice } from '@/lib/utils';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';

interface Opportunity {
  id: string;
  eventId: string;
  opportunityScore: number;
  confidenceScore: number;
  estimatedBuyPrice: string;
  estimatedSellPrice: string;
  estimatedFees: string;
  projectedProfit: string;
  status: string;
  event: { name: string; startTime: string; category: string };
  rationale: Record<string, unknown>;
}

const PAGE_SIZE = 20;

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'opportunityScore', dir: 'desc' });

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (statusFilter) query.set('status', statusFilter);
      query.set('limit', String(PAGE_SIZE));
      query.set('offset', String((page - 1) * PAGE_SIZE));
      query.set('sortKey', sort.key);
      query.set('sortOrder', sort.dir);
      const res = await fetch(`/api/opportunities?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch opportunities');
      const json = await res.json();
      setOpportunities(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setOpportunities([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page, sort.key, sort.dir]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const columns: DataTableColumn<Opportunity>[] = [
    { id: 'event', header: 'Event', accessor: (r) => r.event?.name, sortKey: 'opportunityScore', render: (_, r) => <span className="font-semibold">{r.event?.name}</span> },
    { id: 'date', header: 'Date', accessor: (r) => r.event?.startTime, render: (_, r) => new Date(r.event?.startTime ?? 0).toLocaleDateString() },
    { id: 'category', header: 'Category', accessor: (r) => r.event?.category },
    { id: 'score', header: 'Score', accessor: (r) => r.opportunityScore, sortKey: 'opportunityScore', render: (v) => <span className="font-semibold text-blue-600">{Number(v)}</span> },
    { id: 'buy', header: 'Buy', accessor: (r) => r.estimatedBuyPrice, render: (_, r) => formatPrice(Number(r.estimatedBuyPrice)) },
    { id: 'sell', header: 'Sell', accessor: (r) => r.estimatedSellPrice, render: (_, r) => formatPrice(Number(r.estimatedSellPrice)) },
    { id: 'profit', header: 'Projected', accessor: (r) => r.projectedProfit, sortKey: 'projectedProfit', render: (_, r) => <span className="text-green-600 font-medium">{formatPrice(Number(r.projectedProfit))}</span> },
    { id: 'confidence', header: 'Conf.', accessor: (r) => r.confidenceScore, render: (v) => `${v}%` },
    { id: 'status', header: 'Status', accessor: (r) => r.status, render: (_, r) => <span className={r.status === 'OPEN' ? 'badge badge-green' : r.status === 'WATCHING' ? 'badge badge-yellow' : r.status === 'ACTIONED' ? 'badge badge-blue' : 'badge badge-red'}>{r.status}</span> },
  ];

  if (loading && opportunities.length === 0) return <div className="text-center py-8">Loading opportunities…</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Opportunities</h1>
        <div className="flex gap-2">
          <select className="input input-sm w-auto" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="WATCHING">Watching</option>
            <option value="ACTIONED">Actioned</option>
            <option value="CLOSED">Closed</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>}

      <div className="card">
        <div className="card-body">
          <DataTable
            columns={columns}
            data={opportunities}
            keyExtractor={(r) => r.id}
            sort={sort}
            onSort={(key, dir) => setSort({ key, dir })}
            filterSlot={
              <select className="input input-sm w-auto" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                <option value="">All statuses</option>
                <option value="OPEN">Open</option>
                <option value="WATCHING">Watching</option>
                <option value="ACTIONED">Actioned</option>
                <option value="CLOSED">Closed</option>
                <option value="REJECTED">Rejected</option>
              </select>
            }
            pagination={{
              total,
              page,
              pageSize: PAGE_SIZE,
              onPageChange: setPage,
            }}
            emptyMessage="No opportunities found. Log observations to discover deals."
          />
        </div>
      </div>
    </div>
  );
}
