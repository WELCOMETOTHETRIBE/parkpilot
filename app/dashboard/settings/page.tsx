'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Setting {
  key: string;
  value: unknown;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setSettings(Array.isArray(data) ? data : []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-8">Loading settings…</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>}

      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-gray-900">API &amp; integrations</h2>
          <p className="text-sm text-gray-500 mt-1">Credentials are read from environment variables. Configure in your deployment platform or <code className="text-xs bg-gray-100 px-1 rounded">.env</code>.</p>
        </div>
        <div className="card-body space-y-3 text-sm text-gray-600">
          <ul className="list-disc list-inside space-y-1">
            <li><strong>SERPAPI_API_KEY</strong> — used for Discover (venues, events, parking search).</li>
            <li><strong>OPENAI_API_KEY</strong> — used for venue normalization, event/parking parsing, and opportunity rationale.</li>
            <li><strong>SMTP_*</strong> — for email alerts (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ALERT_EMAIL_FROM).</li>
          </ul>
          <p>See <code className="bg-gray-100 px-1 rounded">.env.example</code> or project README for a full list.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-gray-900">Alert preferences</h2>
          <p className="text-sm text-gray-500 mt-1">Alert rules and channels can be configured here in a future update. For now, alerts are created by the system and listed on the Alerts page.</p>
        </div>
        <div className="card-body text-sm text-gray-600">
          <p>To receive email alerts, set SMTP environment variables and ensure alert processing runs (e.g. via the job worker).</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-gray-900">Application settings (DB)</h2>
        </div>
        <div className="card-body">
          {settings.length === 0 ? (
            <p className="text-gray-600 text-sm">No key-value settings in the database.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {settings.map((setting) => (
                  <tr key={setting.key}>
                    <td className="font-medium">{setting.key}</td>
                    <td className="text-sm text-gray-600">
                      {typeof setting.value === 'object' ? JSON.stringify(setting.value) : String(setting.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-gray-900">Manual adjustments</h2>
        </div>
        <div className="card-body text-sm text-gray-600 space-y-2">
          <p>Configuration that requires a restart (e.g. database URL, API keys) must be changed in your environment. In production, use your deployment dashboard (e.g. Railway, Vercel, Render).</p>
          <p>For documentation and setup, see the project <Link href="https://github.com" className="text-blue-600 hover:underline">README</Link> or <code className="bg-gray-100 px-1 rounded">.env.example</code>.</p>
        </div>
      </div>
    </div>
  );
}
