'use client';

import { useEffect, useState } from 'react';
import { formatPrice, formatDateTime } from '@/lib/utils';

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
  event: {
    name: string;
    startTime: string;
    category: string;
  };
  rationale: Record<string, unknown>;
}

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    fetchOpportunities();
  }, [statusFilter]);

  async function fetchOpportunities() {
    try {
      const query = new URLSearchParams();
      if (statusFilter) query.append('status', statusFilter);
      const res = await fetch(`/api/opportunities?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch opportunities');
      const data = await res.json();
      setOpportunities(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="text-center py-8">Loading opportunities...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Opportunities</h1>
        <div className="flex gap-2">
          <select
            className="input"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="WATCHING">Watching</option>
            <option value="ACTIONED">Actioned</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {opportunities.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-8">
            <p className="text-gray-600">No opportunities found</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {opportunities
            .sort((a, b) => b.opportunityScore - a.opportunityScore)
            .map(opp => (
              <div key={opp.id} className="card hover:shadow-lg transition-shadow">
                <div className="card-body">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{opp.event.name}</h3>
                      <p className="text-gray-600 text-sm mt-1">
                        {new Date(opp.event.startTime).toLocaleDateString()} · {opp.event.category}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-blue-600">{opp.opportunityScore}</div>
                      <p className="text-gray-600 text-xs">Opportunity Score</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-4 mt-4 pt-4 border-t border-gray-200">
                    <div>
                      <p className="text-gray-600 text-sm">Buy Price</p>
                      <p className="font-semibold text-gray-900">{formatPrice(Number(opp.estimatedBuyPrice))}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Sell Price</p>
                      <p className="font-semibold text-gray-900">{formatPrice(Number(opp.estimatedSellPrice))}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Fees</p>
                      <p className="font-semibold text-gray-900">{formatPrice(Number(opp.estimatedFees))}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Projected Profit</p>
                      <p className="font-semibold text-green-600">{formatPrice(Number(opp.projectedProfit))}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Confidence</p>
                      <p className="font-semibold text-gray-900">{opp.confidenceScore}%</p>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-between items-center">
                    <span className={`badge ${
                      opp.status === 'OPEN' ? 'badge-green' :
                      opp.status === 'WATCHING' ? 'badge-yellow' :
                      opp.status === 'ACTIONED' ? 'badge-blue' :
                      'badge-red'
                    }`}>
                      {opp.status}
                    </span>
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      View Details →
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
