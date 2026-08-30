'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Badge, Button, Card, PageHeader, Spinner } from '@/components/ui';

interface Setting {
  key: string;
  value?: string;
  valueJson?: Record<string, unknown> | null;
  description?: string;
  isPublic?: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { value: string; isPublic: boolean }>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Setting[]>('/site-settings');
      setSettings(res);
      const d: Record<string, { value: string; isPublic: boolean }> = {};
      for (const s of res) {
        d[s.key] = { value: s.value ?? '', isPublic: s.isPublic ?? false };
      }
      setDrafts(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(key: string) {
    const d = drafts[key];
    if (!d) return;
    setSavingKey(key);
    setNotice(null);
    try {
      await api.patch(`/site-settings/${key}`, { value: d.value, isPublic: d.isPublic });
      setNotice(`Saved setting "${key}"`);
      void load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save setting');
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <>
      <PageHeader title="Site Settings" subtitle="Configuration values read by the public website" />
      {notice ? <div className="toast">{notice}</div> : null}
      <Card>
        {error ? <div className="error-state">Error: {error}</div> : null}
        {loading ? (
          <Spinner />
        ) : settings.length === 0 ? (
          <p className="empty-state">No settings defined yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Value</th>
                <th style={{ whiteSpace: 'nowrap' }}>Public</th>
                <th>Description</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {settings.map((s) => {
                const d = drafts[s.key];
                return (
                  <tr key={s.key}>
                    <td>
                      <code>{s.key}</code>
                      {s.valueJson ? (
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>JSON value</div>
                      ) : null}
                    </td>
                    <td>
                      <input
                        className="input"
                        style={{ width: '100%' }}
                        type={s.valueJson ? 'text' : 'text'}
                        value={d?.value ?? ''}
                        disabled={!!s.valueJson}
                        placeholder={s.valueJson ? JSON.stringify(s.valueJson) : ''}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [s.key]: { value: e.target.value, isPublic: d?.isPublic ?? false } }))
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={d?.isPublic ?? false}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [s.key]: { value: d?.value ?? '', isPublic: e.target.checked } }))
                        }
                      />
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: 13 }}>{s.description ?? '—'}</td>
                    <td>
                      <Button variant="secondary" disabled={savingKey === s.key} onClick={() => save(s.key)}>
                        {savingKey === s.key ? 'Saving…' : 'Save'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
