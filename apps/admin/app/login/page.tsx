'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { clearAllAuth } from '@/lib/api';
import Logo from '@/components/Logo';

function AdminLoginForm() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isExpired = searchParams.get('expired') === '1';
  const redirectTarget = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isExpired) {
      clearAllAuth();
    }
  }, [isExpired]);

  useEffect(() => {
    if (!loading && user && !isExpired) {
      router.replace(redirectTarget);
    }
  }, [loading, user, router, isExpired, redirectTarget]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace(redirectTarget);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  function fillAdmin() {
    setEmail('admin@sunseeker.local');
    setPassword('ChangeMe123!');
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={onSubmit}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <Logo variant="dark" showTagline={true} />
        </div>
        <h1 className="auth-title">Sunseekers Super Admin</h1>
        <p className="auth-sub">Manage users, roles, website content and CRM oversight</p>

        {isExpired ? (
          <div
            style={{
              padding: '10px 14px',
              background: '#fffbeb',
              color: '#b45309',
              border: '1px solid #fde68a',
              borderRadius: '6px',
              fontSize: '13px',
              marginBottom: '14px',
              fontWeight: 500,
            }}
          >
            ⚠️ Your session expired. Please sign in to resume.
          </div>
        ) : null}

        {error ? <div className="auth-error">{error}</div> : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label className="field">
            <span className="field-label">Email</span>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@sunseeker.local"
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Password</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />
          </label>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>

          <button
            type="button"
            onClick={fillAdmin}
            style={{
              marginTop: 4,
              background: 'none',
              border: '1px dashed #cbd5e1',
              borderRadius: 6,
              padding: '8px 12px',
              fontSize: 12,
              color: '#64748b',
              cursor: 'pointer',
            }}
          >
            Fill Super Admin Credentials
          </button>
        </div>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="auth-wrap">Loading…</div>}>
      <AdminLoginForm />
    </Suspense>
  );
}

