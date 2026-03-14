'use client';

import { useEffect, useState } from 'react';

interface Setting {
  key: string;
  value: unknown;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="text-center py-8">Loading settings...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold">Application Settings</h2>
        </div>
        <div className="card-body">
          {settings.length === 0 ? (
            <p className="text-gray-600">No settings found</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {settings.map(setting => (
                  <tr key={setting.key}>
                    <td className="font-semibold">{setting.key}</td>
                    <td>
                      {typeof setting.value === 'object'
                        ? JSON.stringify(setting.value)
                        : String(setting.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card mt-6">
        <div className="card-header">
          <h2 className="font-semibold">Manual Adjustments</h2>
        </div>
        <div className="card-body">
          <div className="space-y-4 text-sm text-gray-600">
            <p>
              All adjustments are made through environment variables and require a restart. 
              In production, use Railway dashboard or your deployment platform.
            </p>
            <p>
              For immediate changes, edit API payloads directly via requests or admin panel extensions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
