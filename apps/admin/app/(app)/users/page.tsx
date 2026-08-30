'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, Paginated } from '@/lib/api';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Pagination,
  Select,
  Spinner,
  Table,
} from '@/components/ui';

interface UserItem {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  status: string;
  createdAt: string;
  roles?: { id: string; name: string }[];
}

interface RoleItem {
  id: string;
  name: string;
  description?: string;
}

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<UserItem> | null>(null);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    status: 'ACTIVE',
    roleId: '',
    roleAssignee: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Paginated<UserItem>>(`/users?limit=20&page=${page}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
    api
      .get<Paginated<RoleItem>>('/roles?limit=50')
      .then((r) => setRoles(r.items))
      .catch(() => undefined);
  }, [load]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      await api.post('/users', {
        email: form.email,
        password: form.password,
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
        status: form.status,
        roleIds: form.roleId ? [form.roleId] : [],
      });
      setShowCreate(false);
      setForm({ email: '', password: '', firstName: '', lastName: '', status: 'ACTIVE', roleId: '', roleAssignee: '' });
      void load();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setCreating(false);
    }
  }

  async function assignRole(userId: string, roleId: string) {
    if (!roleId) return;
    try {
      await api.post(`/users/${userId}/roles`, { roleId });
      void load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to assign role');
    }
  }

  async function removeRole(userId: string, roleId: string) {
    try {
      await api.delete(`/users/${userId}/roles/${roleId}`);
      void load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove role');
    }
  }

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Manage staff accounts and their role assignments"
        action={<Button onClick={() => setShowCreate(true)}>Add user</Button>}
      />

      {error ? <ErrorState message={error} /> : null}
      {loading && !data ? <Spinner /> : null}
      {data ? (
        <Card>
          <Table<UserItem>
            keyOf={(u) => u.id}
            rows={data.items}
            columns={[
              {
                key: 'name',
                label: 'Name',
                render: (u) => `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || '—',
              },
              { key: 'email', label: 'Email', render: (u) => u.email },
              {
                key: 'roles',
                label: 'Roles',
                render: (u) => (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                    {(u.roles ?? []).map((r) => (
                      <span key={r.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Badge>{r.name}</Badge>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: 0, fontSize: 12 }}
                          onClick={() => removeRole(u.id, r.id)}
                          title="Remove role"
                          type="button"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                    <select
                      className="input"
                      style={{ padding: '2px 6px', fontSize: 12 }}
                      value={form.roleAssignee === u.id ? form.roleId : ''}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, roleAssignee: u.id, roleId: e.target.value }));
                        if (e.target.value) assignRole(u.id, e.target.value);
                      }}
                    >
                      <option value="">+ role</option>
                      {roles
                        .filter((r) => !(u.roles ?? []).some((ur) => ur.id === r.id))
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                    </select>
                  </div>
                ),
              },
              {
                key: 'status',
                label: 'Status',
                render: (u) => <Badge>{u.status}</Badge>,
              },
              {
                key: 'created',
                label: 'Created',
                render: (u) => new Date(u.createdAt).toLocaleDateString(),
              },
            ]}
          />
          <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </Card>
      ) : null}

      {showCreate ? (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={createUser}>
            <h3 className="modal-title">Add user</h3>
            {createError ? <div className="auth-error">{createError}</div> : null}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Input
                label="Email"
                name="email"
                type="email"
                value={form.email}
                required
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                label="Password (min 8 chars)"
                name="password"
                type="password"
                value={form.password}
                required
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <div className="form-grid">
                <Input
                  label="First name"
                  name="firstName"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                />
                <Input
                  label="Last name"
                  name="lastName"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                />
              </div>
              <Select
                label="Status"
                name="status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                options={[
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'INACTIVE', label: 'Inactive' },
                  { value: 'SUSPENDED', label: 'Suspended' },
                ]}
              />
              <Select
                label="Assign role"
                name="roleId"
                value={form.roleId}
                onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                options={[{ value: '', label: '— none —' }, ...roles.map((r) => ({ value: r.id, label: r.name }))]}
              />
              <div className="form-actions">
                <Button type="submit" disabled={creating}>
                  {creating ? 'Creating…' : 'Create user'}
                </Button>
                <Button variant="secondary" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
