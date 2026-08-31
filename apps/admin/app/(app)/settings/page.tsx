'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { Button, PageHeader, Spinner } from '@/components/ui';

interface Setting {
  key: string;
  group?: string;
  value?: string | null;
  valueJson?: Record<string, unknown> | null;
  description?: string;
  isPublic?: boolean;
}

interface Category {
  key: string;
  label: string;
  icon: string;
  blurb: string;
}

const CATEGORIES: Category[] = [
  { key: 'general', label: 'General', icon: '⚙️', blurb: 'Basic site identity settings used across the website.' },
  { key: 'navigation', label: 'Navigation', icon: '🧭', blurb: 'Menus shown in the header and footer of the public site.' },
  { key: 'contact', label: 'Contact', icon: '📞', blurb: 'Phone, email and address details displayed publicly.' },
  { key: 'social', label: 'Social', icon: '🔗', blurb: 'Links to your social media profiles.' },
  { key: 'seo', label: 'SEO', icon: '🚀', blurb: 'Search engine titles, descriptions and share images.' },
];

interface StringDraft {
  type: 'string';
  value: string;
  isPublic: boolean;
}

interface JsonListDraft {
  type: 'jsonList';
  rootKey: string;
  rows: { label: string; href: string }[];
  isPublic: boolean;
}

type Draft = StringDraft | JsonListDraft;

function detectKind(s: Setting): 'string' | 'jsonList' {
  if (s.valueJson && typeof s.valueJson === 'object') {
    const keys = Object.keys(s.valueJson);
    if (keys.length === 1) return 'jsonList';
  }
  return 'string';
}

function toDraft(s: Setting): Draft {
  const kind = detectKind(s);
  if (kind === 'jsonList' && s.valueJson) {
    const keys = Object.keys(s.valueJson);
    const rootKey = keys[0];
    const raw = (s.valueJson as Record<string, unknown>)[rootKey];
    const rows = Array.isArray(raw)
      ? (raw as { label?: string; href?: string }[]).map((r) => ({
          label: String(r.label ?? ''),
          href: String(r.href ?? ''),
        }))
      : [];
    return { type: 'jsonList', rootKey, rows, isPublic: s.isPublic ?? false };
  }
  return { type: 'string', value: s.value ?? '', isPublic: s.isPublic ?? false };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [active, setActive] = useState<string>('general');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Setting[]>('/site-settings');
      setSettings(res);
      const d: Record<string, Draft> = {};
      for (const s of res) d[s.key] = toDraft(s);
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

  const grouped = useMemo(() => {
    const map: Record<string, Setting[]> = {};
    for (const c of CATEGORIES) map[c.key] = [];
    for (const s of settings) {
      const g = s.group || 'general';
      if (!map[g]) map[g] = [];
      map[g].push(s);
    }
    return map;
  }, [settings]);

  function updateString(key: string, value: string) {
    const d = drafts[key];
    if (!d || d.type !== 'string') return;
    setDrafts((prev) => ({ ...prev, [key]: { ...d, value } }));
  }

  function updateJsonRow(key: string, index: number, patch: Partial<{ label: string; href: string }>) {
    const d = drafts[key];
    if (!d || d.type !== 'jsonList') return;
    const rows = d.rows.map((r, i) => (i === index ? { ...r, ...patch } : r));
    setDrafts((prev) => ({ ...prev, [key]: { ...d, rows } }));
  }

  function addJsonRow(key: string) {
    const d = drafts[key];
    if (!d || d.type !== 'jsonList') return;
    setDrafts((prev) => ({ ...prev, [key]: { ...d, rows: [...d.rows, { label: '', href: '' }] } }));
  }

  function removeJsonRow(key: string, index: number) {
    const d = drafts[key];
    if (!d || d.type !== 'jsonList') return;
    setDrafts((prev) => ({ ...prev, [key]: { ...d, rows: d.rows.filter((_, i) => i !== index) } }));
  }

  async function saveCategory(group: string) {
    setSaving(true);
    setNotice(null);
    const groupSettings = grouped[group] ?? [];
    try {
      for (const s of groupSettings) {
        const d = drafts[s.key];
        if (!d) continue;
        const body: Record<string, unknown> = { group, isPublic: d.isPublic };
        if (d.type === 'string') {
          body.value = d.value;
        } else {
          body.valueJson = { [d.rootKey]: d.rows.filter((r) => r.label || r.href) };
        }
        await api.patch(`/site-settings/${s.key}`, body);
      }
      setNotice(`Saved ${CATEGORIES.find((c) => c.key === group)?.label ?? group} settings`);
      void load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  const dirty =
    grouped[active]?.some((s) => {
      const d = drafts[s.key];
      if (!d) return false;
      return JSON.stringify(toDraft(s)) !== JSON.stringify(d);
    }) ?? false;

  return (
    <>
      <PageHeader title="Site Settings" subtitle="Configure the public website like WordPress settings" />
      {notice ? <div className="toast">{notice}</div> : null}
      {error ? <div className="error-state">Error: {error}</div> : null}

      {loading ? (
        <Spinner />
      ) : (
        <div className="settings-layout">
          {/* Left sidebar: categories */}
          <aside className="settings-nav">
            {CATEGORIES.map((c) => {
              const isActive = active === c.key;
              const count = (grouped[c.key] ?? []).length;
              return (
                <button
                  key={c.key}
                  type="button"
                  className={`settings-nav-item${isActive ? ' active' : ''}`}
                  onClick={() => setActive(c.key)}
                >
                  <span className="settings-nav-icon">{c.icon}</span>
                  <span className="settings-nav-label">{c.label}</span>
                  <span className="settings-nav-count">{count}</span>
                </button>
              );
            })}
          </aside>

          {/* Right panel: settings for the selected category */}
          <div className="settings-panel">
            <div className="settings-panel-head">
              <div>
                <h3 className="settings-panel-title">{CATEGORIES.find((c) => c.key === active)?.label}</h3>
                <p className="settings-panel-blurb">{CATEGORIES.find((c) => c.key === active)?.blurb}</p>
              </div>
              <Button
                variant={dirty ? 'primary' : 'secondary'}
                disabled={saving || !dirty}
                onClick={() => saveCategory(active)}
              >
                {saving ? 'Saving…' : dirty ? 'Save Changes' : 'Saved'}
              </Button>
            </div>

            {(grouped[active] ?? []).length === 0 ? (
              <p className="empty-state">No settings in this category yet.</p>
            ) : (
              <div className="settings-fields">
                {(grouped[active] ?? []).map((s) => {
                  const d = drafts[s.key];
                  if (!d) return null;
                  return (
                    <div key={s.key} className="settings-field">
                      <div className="settings-field-head">
                        <code className="settings-key">{s.key}</code>
                        <label className="settings-public">
                          <input
                            type="checkbox"
                            checked={d.isPublic}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [s.key]: { ...d, isPublic: e.target.checked } as Draft,
                              }))
                            }
                          />
                          Public on site
                        </label>
                      </div>
                      {s.description ? <p className="settings-desc">{s.description}</p> : null}

                      {d.type === 'string' ? (
                        <input
                          className="input"
                          value={d.value}
                          onChange={(e) => updateString(s.key, e.target.value)}
                        />
                      ) : (
                        <div className="settings-json-list">
                          {(d as JsonListDraft).rows.map((row, i) => (
                            <div key={i} className="settings-json-row">
                              <input
                                className="input"
                                placeholder="Label (e.g. About Us)"
                                value={row.label}
                                onChange={(e) => updateJsonRow(s.key, i, { label: e.target.value })}
                              />
                              <input
                                className="input"
                                placeholder="Link (e.g. /about)"
                                value={row.href}
                                onChange={(e) => updateJsonRow(s.key, i, { href: e.target.value })}
                              />
                              <button type="button" className="btn btn-ghost" onClick={() => removeJsonRow(s.key, i)}>
                                ✕
                              </button>
                            </div>
                          ))}
                          <Button variant="secondary" onClick={() => addJsonRow(s.key)}>
                            + Add item
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
