'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, Paginated } from '@/lib/api';
import { Badge, Button, Card, ErrorState, Input, PageHeader, Spinner } from '@/components/ui';

interface RoleItem {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  permissionKeys: string[];
  effectivePermissionKeys: string[];
}

interface PermissionGroup {
  group: string;
  keys: string[];
}

interface PermissionCatalog {
  total: number;
  groups: PermissionGroup[];
  keys: string[];
}

interface UserItem {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: { id: string; name: string }[];
}

const SUPER_ADMIN = 'SUPER_ADMIN';

function label(key: string) {
  const [, action, subject = ''] = key.split('.');
  const pretty = (s: string) =>
    s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
  return subject ? `${pretty(action)} ${subject}` : pretty(action);
}

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [catalog, setCatalog] = useState<PermissionCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<RoleItem | null>(null);
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [members, setMembers] = useState<UserItem[] | null>(null);
  const [memberRole, setMemberRole] = useState<RoleItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [roleRes, catRes] = await Promise.all([
        api.get<Paginated<RoleItem>>('/roles?limit=100'),
        api.get<PermissionCatalog>('/roles/permissions'),
      ]);
      setRoles(roleRes.items);
      setCatalog(catRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openEditor = (role: RoleItem) => {
    setEditing(role);
    setSaveError(null);
    setDraft(new Set(role.effectivePermissionKeys));
  };

  function toggle(key: string) {
    if (!editing || editing.name === SUPER_ADMIN) return;
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleGroup(group: PermissionGroup) {
    if (!editing || editing.name === SUPER_ADMIN) return;
    setDraft((prev) => {
      const allOn = group.keys.every((k) => prev.has(k));
      const next = new Set(prev);
      for (const k of group.keys) {
        if (allOn) next.delete(k);
        else next.add(k);
      }
      return next;
    });
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (editing.name === SUPER_ADMIN) {
        // SUPER_ADMIN is always granted everything; only the label is editable.
        await api.patch(`/roles/${editing.id}`, { description: editing.description ?? '' });
      } else {
        await api.put(`/roles/${editing.id}/permissions`, { permissionKeys: Array.from(draft) });
      }
      setEditing(null);
      void load();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save role');
    } finally {
      setSaving(false);
    }
  }

  async function createRole(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      await api.post('/roles', {
        name: createForm.name,
        description: createForm.description || undefined,
        permissionKeys: Array.from(selected),
      });
      setShowCreate(false);
      setCreateForm({ name: '', description: '' });
      setSelected(new Set());
      void load();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create role');
    } finally {
      setCreating(false);
    }
  }

  async function removeRole(role: RoleItem) {
    if (!confirm(`Delete role ${role.name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/roles/${role.id}`);
      void load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete role');
    }
  }

  async function openMembers(role: RoleItem) {
    setMemberRole(role);
    setMembers(null);
    try {
      const res = await api.get<Paginated<UserItem>>('/users?limit=200');
      setMembers(res.items.filter((u) => u.roles.some((r) => r.id === role.id)));
    } catch (err) {
      setMembers([]);
      alert(err instanceof Error ? err.message : 'Failed to load users');
    }
  }

  const draftCount = useMemo(() => draft.size, [draft]);

  return (
    <>
      <PageHeader
        title="Roles & Permissions"
        subtitle="Edit what each role can do, and see who holds it"
        action={<Button onClick={() => setShowCreate(true)}>New role</Button>}
      />

      {error ? <ErrorState message={error} /> : null}
      {loading && !roles.length ? <Spinner /> : null}

      <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
        {roles.map((role) => {
          const isSuper = role.name === SUPER_ADMIN;
          const isOpen = editing?.id === role.id;
          return (
            <Card key={role.id}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ minWidth: 240 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong>{role.name}</strong>
                    {role.isSystem ? <Badge>system</Badge> : null}
                    {isSuper ? <Badge>full access</Badge> : null}
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
                    {role.description || 'No description'}
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>
                    {role.effectivePermissionKeys.length} permission
                    {role.effectivePermissionKeys.length === 1 ? '' : 's'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button variant="secondary" onClick={() => openMembers(role)}>
                    Users
                  </Button>
                  <Button variant="secondary" onClick={() => openEditor(role)}>
                    {isOpen ? 'Close' : 'Edit'}
                  </Button>
                  {!role.isSystem ? (
                    <Button variant="danger" onClick={() => removeRole(role)}>
                      Delete
                    </Button>
                  ) : null}
                </div>
              </div>

              {!isOpen ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 12 }}>
                  {role.effectivePermissionKeys.length === 0 ? (
                    <span style={{ color: 'var(--muted)' }}>No permissions granted</span>
                  ) : (
                    role.effectivePermissionKeys.slice(0, 14).map((k) => <Badge key={k}>{k}</Badge>)
                  )}
                  {role.effectivePermissionKeys.length > 14 ? (
                    <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                      +{role.effectivePermissionKeys.length - 14} more
                    </span>
                  ) : null}
                </div>
              ) : null}

              {isOpen ? (
                <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  {saveError ? <div className="auth-error">{saveError}</div> : null}

                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                    <Input
                      label="Description"
                      name={`desc-${role.id}`}
                      value={editing?.description ?? ''}
                      onChange={(e) =>
                        setEditing((prev) => (prev ? { ...prev, description: e.target.value } : prev))
                      }
                    />
                  </div>

                  {isSuper ? (
                    <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                      SUPER_ADMIN always has every permission in the system, including any added in
                      the future, so there is nothing to select here.
                    </p>
                  ) : (
                    <>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 8,
                          flexWrap: 'wrap',
                          gap: 8,
                        }}
                      >
                        <strong>Permissions ({draftCount} selected)</strong>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Button variant="secondary" onClick={() => setDraft(new Set(catalog?.keys ?? []))}>
                            Select all
                          </Button>
                          <Button variant="secondary" onClick={() => setDraft(new Set())}>
                            Clear
                          </Button>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gap: 12 }}>
                        {(catalog?.groups ?? []).map((group) => {
                          const allOn = group.keys.every((k) => draft.has(k));
                          return (
                            <div
                              key={group.group}
                              style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  marginBottom: 8,
                                }}
                              >
                                <strong style={{ textTransform: 'capitalize' }}>{group.group}</strong>
                                <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12 }}>
                                  <input
                                    type="checkbox"
                                    checked={allOn}
                                    onChange={() => toggleGroup(group)}
                                  />
                                  all
                                </label>
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                {group.keys.map((key) => (
                                  <label
                                    key={key}
                                    style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={draft.has(key)}
                                      onChange={() => toggle(key)}
                                    />
                                    {label(key)}
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  <div className="form-actions" style={{ marginTop: 16 }}>
                    <Button onClick={save} disabled={saving}>
                      {saving ? 'Saving…' : 'Save changes'}
                    </Button>
                    <Button variant="secondary" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>

      {showCreate ? (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={createRole}>
            <h3 className="modal-title">New role</h3>
            {createError ? <div className="auth-error">{createError}</div> : null}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Input
                label="Name (e.g. RESERVATIONS_AGENT)"
                name="roleName"
                value={createForm.name}
                required
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
              <Input
                label="Description"
                name="roleDescription"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              />
              <div>
                <strong style={{ fontSize: 13 }}>Permissions ({selected.size} selected)</strong>
                <div style={{ display: 'grid', gap: 8, marginTop: 8, maxHeight: 320, overflowY: 'auto' }}>
                  {(catalog?.groups ?? []).map((group) => (
                    <div key={group.group} style={{ fontSize: 12 }}>
                      <div style={{ textTransform: 'capitalize', fontWeight: 600, marginBottom: 4 }}>
                        {group.group}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        {group.keys.map((key) => (
                          <label
                            key={key}
                            style={{ display: 'flex', gap: 6, alignItems: 'center' }}
                          >
                            <input
                              type="checkbox"
                              checked={selected.has(key)}
                              onChange={() =>
                                setSelected((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(key)) next.delete(key);
                                  else next.add(key);
                                  return next;
                                })
                              }
                            />
                            {label(key)}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="form-actions">
                <Button type="submit" disabled={creating}>
                  {creating ? 'Creating…' : 'Create role'}
                </Button>
                <Button variant="secondary" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </div>
      ) : null}

      {memberRole ? (
        <div className="modal-backdrop" onClick={() => setMemberRole(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Users with {memberRole.name}</h3>
            {members === null ? (
              <Spinner />
            ) : members.length === 0 ? (
              <p style={{ color: 'var(--muted)' }}>No users hold this role yet.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {members.map((u) => (
                  <li key={u.id} style={{ marginBottom: 6 }}>
                    <strong>{`${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email}</strong>{' '}
                    <span style={{ color: 'var(--muted)' }}>({u.email})</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="form-actions">
              <Button variant="secondary" onClick={() => setMemberRole(null)}>
                Close
              </Button>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>
              Add or remove roles for a user from the Users page.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
