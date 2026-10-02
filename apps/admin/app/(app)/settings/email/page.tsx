'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Badge, Button, Card, PageHeader, Spinner } from '@/components/ui';

interface MailStatus {
  configured: boolean;
  host: string | null;
  port: number | null;
  user: string | null;
  from: string;
}

export default function EmailAndBackupSettingsPage() {
  const [status, setStatus] = useState<MailStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testNotice, setTestNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<MailStatus>('/mail/status');
      setStatus(res);
    } catch {
      // If error or unauthenticated, fallback to default state
      setStatus({
        configured: false,
        host: null,
        port: null,
        user: null,
        from: 'Sunseekers Tours <noreply@sunseekerstours.com>',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function handleSendTest(e: React.FormEvent) {
    e.preventDefault();
    if (!testEmail) return;

    setSendingTest(true);
    setTestNotice(null);

    try {
      const res = await api.post<{ success: boolean; message: string }>('/mail/test', {
        to: testEmail,
      });
      setTestNotice({
        type: 'success',
        message: res.message || `Test email successfully sent to ${testEmail}!`,
      });
    } catch (err: any) {
      setTestNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to send test email.',
      });
    } finally {
      setSendingTest(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email & Automated Backup Infrastructure"
        subtitle="Manage external SMTP mail dispatch and Google Drive cloud backups"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/settings">
              <Button variant="secondary">← Back to Site Settings</Button>
            </Link>
            <Link href="/settings/automations">
              <Button variant="secondary">Automation Rules →</Button>
            </Link>
          </div>
        }
      />

      {loading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: External SMTP Mailer */}
          <Card className="p-6 space-y-6">
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <span>✉️</span> External SMTP Mailer
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Sends customer invoices, tour booking receipts, and staff notifications.
                </p>
              </div>
              <Badge variant={status?.configured ? 'success' : 'warning'}>
                {status?.configured ? 'Connected & Ready' : 'Simulated / Unconfigured'}
              </Badge>
            </div>

            {/* SMTP Status Details */}
            <div className="rounded-lg bg-muted/40 p-4 space-y-2 border border-border text-sm">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium text-foreground">
                  {status?.configured ? 'Active (Live SMTP)' : 'Fallback (Console Simulation)'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">SMTP Server Host:</span>
                <span className="font-mono text-xs font-semibold text-foreground">
                  {status?.host || 'Not set (using fallback)'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Port:</span>
                <span className="font-mono text-xs text-foreground">
                  {status?.port || '587'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Authenticated User:</span>
                <span className="font-mono text-xs text-foreground">
                  {status?.user || 'None'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Default Sender ("From"):</span>
                <span className="font-medium text-foreground text-xs truncate max-w-[260px]">
                  {status?.from}
                </span>
              </div>
            </div>

            {/* Send Test Email Form */}
            <div className="space-y-3 pt-2">
              <h4 className="text-sm font-semibold text-foreground">Send Test Email</h4>
              <p className="text-xs text-muted-foreground">
                Verify outgoing email delivery by sending a test message to an inbox of your choice.
              </p>

              {testNotice && (
                <div
                  className={`p-3 rounded-md text-xs font-medium ${
                    testNotice.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400'
                      : 'bg-red-500/10 text-red-600 border border-red-500/20 dark:text-red-400'
                  }`}
                >
                  {testNotice.message}
                </div>
              )}

              <form onSubmit={handleSendTest} className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="recipient@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button type="submit" disabled={sendingTest || !testEmail} variant="primary">
                  {sendingTest ? 'Sending…' : 'Send Test'}
                </Button>
              </form>
            </div>
          </Card>

          {/* Card 2: Google Drive Automated Backups */}
          <Card className="p-6 space-y-6">
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <span>☁️</span> Automated Google Drive Backups
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Automatic daily database dumps encrypted and synced offsite to Google Drive.
                </p>
              </div>
              <Badge variant="success">Active (Daily Cron)</Badge>
            </div>

            <div className="rounded-lg bg-muted/40 p-4 space-y-2 border border-border text-sm">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Schedule:</span>
                <span className="font-semibold text-foreground">Daily at 02:00 AM (UTC)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Target Database:</span>
                <span className="font-mono text-xs font-semibold text-foreground">sunseekers (PostgreSQL 16)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Google Drive Destination:</span>
                <span className="font-mono text-xs text-primary font-semibold">gdrive:sunseekers-crm-backups</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Local VPS Retention:</span>
                <span className="text-foreground">Last 7 days (auto-rotated)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Cloud Retention:</span>
                <span className="text-foreground">30 days in Google Drive</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <h4 className="text-sm font-semibold text-foreground">Backup Automation Details</h4>
              <p className="text-xs text-muted-foreground">
                Backups are managed via an automated script located at <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">/usr/local/bin/sunseekers-backup.sh</code>. It dumps the database directly, compresses it using gzip, verifies integrity, and syncs to Google Drive using headless OAuth.
              </p>
              <div className="p-3 bg-muted/30 rounded border border-border text-xs text-muted-foreground">
                ✅ <strong>Manual Trigger:</strong> You can also trigger an immediate on-demand backup at any time by running:
                <pre className="font-mono bg-background p-2 rounded mt-2 text-foreground overflow-x-auto">/usr/local/bin/sunseekers-backup.sh</pre>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Guide Card: How to update SMTP credentials */}
      <Card className="p-6 space-y-4">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <span>🛠️</span> How to Set or Change External SMTP Credentials
        </h3>
        <p className="text-sm text-muted-foreground">
          To connect your email provider (Google Workspace / Gmail, SendGrid, Amazon SES, Brevo, or your hosting webmail), update the environment file on the production VPS or in your Dokploy project environment:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-2">
            <strong className="text-foreground text-sm block">Google Workspace / Gmail (Recommended)</strong>
            <p className="text-muted-foreground">
              Enable 2-Step Verification on your Google account, generate an <strong>App Password</strong> (under Google Account &gt; Security &gt; 2-Step Verification &gt; App Passwords), then configure:
            </p>
            <pre className="p-2.5 bg-background rounded font-mono text-muted-foreground overflow-x-auto">
SMTP_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=info@sunseekerstours.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM="Sunseekers Tours &lt;info@sunseekerstours.com&gt;"
            </pre>
          </div>

          <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-2">
            <strong className="text-foreground text-sm block">Custom SMTP / cPanel Webmail / SendGrid</strong>
            <p className="text-muted-foreground">
              For professional transactional email services or custom domain mail hosts:
            </p>
            <pre className="p-2.5 bg-background rounded font-mono text-muted-foreground overflow-x-auto">
SMTP_ENABLED=true
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=465 (or 587)
SMTP_SECURE=true (if port 465)
SMTP_USER=bookings@sunseekerstours.com
SMTP_PASS=your-mailbox-password
SMTP_FROM="Sunseekers Tours &lt;bookings@sunseekerstours.com&gt;"
            </pre>
          </div>
        </div>
      </Card>
    </div>
  );
}
