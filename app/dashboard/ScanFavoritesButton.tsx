'use client';

import { useState } from 'react';
import { Toast } from '@/components/ui/Toast';

export function ScanFavoritesButton({ className = '' }: { className?: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleScan() {
    setLoading(true);
    setError(null);
    setMessage('');
    try {
      const res = await fetch('/api/discover/scan-favorites', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed');
      setMessage(data.message ?? `Scanning ${data.queued ?? 0} venues. Check Opportunities shortly.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleScan}
        disabled={loading}
        className={className || 'btn btn-primary btn-sm'}
      >
        {loading ? 'Scanning…' : 'Scan my favorite venues'}
      </button>
      {message && <Toast message={message} onDismiss={() => setMessage('')} />}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm mt-2">
          {error}
        </div>
      )}
    </>
  );
}
