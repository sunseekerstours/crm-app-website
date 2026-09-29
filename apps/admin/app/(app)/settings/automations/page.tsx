'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader, Button, Spinner } from '@/components/ui';

interface Setting {
  key: string;
  group?: string;
  value?: string | null;
  description?: string;
}

interface AutomationRuleConfig {
  id: string;
  number: number;
  settingKey: string;
  title: string;
  badge: 'Event-Driven' | 'Hourly Sweep' | 'Pre-Check';
  summary: string;
  example: string;
  inputs?: {
    key: string;
    label: string;
    type: 'number' | 'text' | 'select';
    defaultVal: string;
    unit?: string;
    options?: { value: string; label: string }[];
  }[];
}

const RULES: AutomationRuleConfig[] = [
  {
    id: 'duplicate_detection',
    number: 11,
    settingKey: 'automation_duplicate_detection',
    title: 'Duplicate Customer & Lead Detection',
    badge: 'Pre-Check',
    summary: 'Before creating a new lead, verifies email and normalized phone against existing records. Links to existing customer profile instead of creating duplicates.',
    example: 'New website inquiry matches existing customer → Links record and alerts current account manager.',
    inputs: [
      {
        key: 'automation_duplicate_strategy',
        label: 'Matching Strategy',
        type: 'select',
        defaultVal: 'BOTH',
        options: [
          { value: 'BOTH', label: 'Match on Email or Phone' },
          { value: 'EMAIL', label: 'Match on Email Only' },
          { value: 'PHONE', label: 'Match on Phone Only' },
        ],
      },
    ],
  },
  {
    id: 'auto_assign',
    number: 1,
    settingKey: 'automation_auto_assign_lead',
    title: 'New Lead ➔ Automatic Salesperson Assignment',
    badge: 'Event-Driven',
    summary: 'Automatically assigns unassigned inbound leads to active sales representatives using a least-busy round-robin distribution.',
    example: 'New inquiry from website/social → Auto-assigned to least loaded sales agent → In-app & Telegram alert sent.',
    inputs: [
      {
        key: 'automation_assign_mode',
        label: 'Distribution Algorithm',
        type: 'select',
        defaultVal: 'LEAST_BUSY',
        options: [
          { value: 'LEAST_BUSY', label: 'Least Active Leads (Load-Balanced)' },
          { value: 'ROUND_ROBIN', label: 'Sequential Round-Robin' },
        ],
      },
    ],
  },
  {
    id: 'follow_up_task',
    number: 2,
    settingKey: 'automation_immediate_follow_up_task',
    title: 'New Lead ➔ Immediate Outreach Task & SLA Timer',
    badge: 'Event-Driven',
    summary: 'Generates a high-priority follow-up task on lead assignment with a strict response deadline SLA.',
    example: 'Lead assigned → High-priority task created → Reminds agent if outreach is not logged within SLA.',
    inputs: [
      {
        key: 'automation_lead_sla_hours',
        label: 'Response SLA Window',
        type: 'number',
        defaultVal: '2',
        unit: 'hours from assignment',
      },
    ],
  },
  {
    id: 'no_response_follow_up',
    number: 3,
    settingKey: 'automation_client_silence_follow_up',
    title: 'No Response ➔ Client Silence Follow-Up Nudge',
    badge: 'Hourly Sweep',
    summary: 'If a prospective customer has not responded after an initial quote or outreach message, automatically alerts the assigned agent to re-engage.',
    example: 'Inquiry active with 0 customer replies for 3 days → Nudge task created for agent.',
    inputs: [
      {
        key: 'automation_client_silence_days',
        label: 'Client Silence Threshold',
        type: 'number',
        defaultVal: '3',
        unit: 'days of inactivity',
      },
    ],
  },
  {
    id: 'lead_to_deal',
    number: 4,
    settingKey: 'automation_lead_to_deal_on_qualified',
    title: 'Lead Qualified ➔ Automatic Sales Opportunity (Deal)',
    badge: 'Event-Driven',
    summary: 'When a lead is moved to the QUALIFIED stage, automatically creates a Deal in the pipeline with estimated value and tour details.',
    example: 'Lead marked Qualified → Pipeline Deal created ($2,500+) → Linked to customer and salesperson.',
    inputs: [
      {
        key: 'automation_default_deal_value',
        label: 'Default Estimated Value',
        type: 'number',
        defaultVal: '2500',
        unit: 'when unspecified on lead',
      },
      {
        key: 'automation_default_currency',
        label: 'Default Pipeline Currency',
        type: 'select',
        defaultVal: 'USD',
        options: [
          { value: 'USD', label: 'USD ($)' },
          { value: 'GHS', label: 'GHS (GH₵)' },
          { value: 'EUR', label: 'EUR (€)' },
          { value: 'GBP', label: 'GBP (£)' },
        ],
      },
    ],
  },
  {
    id: 'quote_generation',
    number: 5,
    settingKey: 'automation_auto_draft_quote',
    title: 'Opportunity ➔ Auto-Draft Tour Quotation',
    badge: 'Event-Driven',
    summary: 'Generates a draft quotation with predefined tour pricing tiers and items when an opportunity is created.',
    example: 'Deal created → Draft quotation generated with tour base price and itinerary.',
    inputs: [
      {
        key: 'automation_quote_validity_days',
        label: 'Quote Validity Window',
        type: 'number',
        defaultVal: '14',
        unit: 'days until quote expiry',
      },
    ],
  },
  {
    id: 'quote_follow_up',
    number: 6,
    settingKey: 'automation_quote_follow_up',
    title: 'Quote Sent ➔ 3-Day Follow-Up Reminder',
    badge: 'Hourly Sweep',
    summary: 'Tracks quotations sent to clients that have received no decision after a defined period and prompts the salesperson to follow up.',
    example: 'Quote sent → 3 days of client silence → Nudge notification to agent to check in.',
    inputs: [
      {
        key: 'automation_quote_follow_up_days',
        label: 'Quote Follow-Up Window',
        type: 'number',
        defaultVal: '3',
        unit: 'days after sending quote',
      },
    ],
  },
  {
    id: 'deal_to_invoice',
    number: 7,
    settingKey: 'automation_deal_to_invoice_on_won',
    title: 'Deal Won ➔ Automatic Invoice Generation',
    badge: 'Event-Driven',
    summary: 'When a Deal is marked WON, automatically generates a formal invoice with line items, due date (Net 7), and marks pending quotes accepted.',
    example: 'Deal marked Won → Invoice INV-2026-XXXX generated → Payment terms attached → Telegram celebration sent.',
    inputs: [
      {
        key: 'automation_invoice_due_days',
        label: 'Invoice Payment Terms',
        type: 'select',
        defaultVal: '7',
        options: [
          { value: '3', label: 'Net 3 Days' },
          { value: '7', label: 'Net 7 Days (Default)' },
          { value: '14', label: 'Net 14 Days' },
          { value: '30', label: 'Net 30 Days' },
        ],
      },
    ],
  },
  {
    id: 'auto_receipt',
    number: 8,
    settingKey: 'automation_auto_receipt_on_payment',
    title: 'Payment Confirmed ➔ Automatic Receipt & Booking Confirmation',
    badge: 'Event-Driven',
    summary: 'When a payment is recorded, generates receipt number, marks invoice PAID if full, confirms pending bookings, and notifies Ops.',
    example: 'Payment logged → Receipt REC-XXXX issued → Booking status set to CONFIRMED → Telegram alert dispatched.',
    inputs: [
      {
        key: 'automation_receipt_prefix',
        label: 'Receipt Number Prefix',
        type: 'select',
        defaultVal: 'REC',
        options: [
          { value: 'REC', label: 'REC-YYYY-XXXX (Standard)' },
          { value: 'RCT', label: 'RCT-YYYY-XXXX' },
          { value: 'PMT', label: 'PMT-YYYY-XXXX' },
        ],
      },
    ],
  },
  {
    id: 'overdue_payment',
    number: 9,
    settingKey: 'automation_overdue_payment_escalation',
    title: 'Overdue Invoice ➔ Reminder & Escalation',
    badge: 'Hourly Sweep',
    summary: 'Monitors unpaid invoices past due date and dispatches tiered reminders to client, salesperson, and finance management.',
    example: 'Invoice overdue > 1 day → Agent alert → > 7 days → Telegram alert to Finance & Management.',
    inputs: [
      {
        key: 'automation_overdue_tier1_days',
        label: 'Tier-1 Agent Warning',
        type: 'number',
        defaultVal: '1',
        unit: 'days past due date',
      },
      {
        key: 'automation_overdue_tier3_days',
        label: 'Tier-3 Manager Telegram Escalation',
        type: 'number',
        defaultVal: '7',
        unit: 'days past due date',
      },
    ],
  },
  {
    id: 'post_sale_care',
    number: 10,
    settingKey: 'automation_post_sale_follow_up',
    title: 'Post-Sale ➔ Customer Care & Document Preparation Task',
    badge: 'Event-Driven',
    summary: 'After payment confirmation, creates customer care tasks for welcome packs, packing guidelines, and post-trip review requests.',
    example: 'Payment confirmed → Pre-trip welcome task created → Post-trip repeat booking check-in scheduled.',
    inputs: [
      {
        key: 'automation_post_sale_sla_hours',
        label: 'Welcome Pack SLA Window',
        type: 'number',
        defaultVal: '48',
        unit: 'hours after payment',
      },
    ],
  },
  {
    id: 'inactivity_watchdog',
    number: 12,
    settingKey: 'automation_sales_inactivity_escalation',
    title: 'Sales Inactivity & Manager Escalation',
    badge: 'Hourly Sweep',
    summary: 'Monitors the active sales pipeline and identifies leads or deals neglected for over 24-48 hours. Escalate alerts to management on Telegram.',
    example: 'Lead assigned with 0 updates in 48 hours → Inactivity warning to agent → Escalation alert to Telegram Ops channel.',
    inputs: [
      {
        key: 'automation_inactivity_escalate_hours',
        label: 'Manager Escalation Threshold',
        type: 'number',
        defaultVal: '48',
        unit: 'hours without pipeline activity',
      },
    ],
  },
];

export default function AutomationsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Settings values
  const [values, setValues] = useState<Record<string, string>>({});

  // Telegram test state
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramResult, setTelegramResult] = useState<{ success: boolean; text: string } | null>(null);

  // Manual sweep test state
  const [runningSweep, setRunningSweep] = useState(false);
  const [sweepResult, setSweepResult] = useState<any>(null);
  const [jetpackSyncing, setJetpackSyncing] = useState(false);
  const [jetpackStatus, setJetpackStatus] = useState<any>(null);
  const [jetpackResult, setJetpackResult] = useState<any>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const loadJetpackStatus = async () => {
    try {
      const res = await api.get<any>('/jetpack-crm/status?full=1');
      setJetpackStatus(res);
    } catch (err: any) {
      setJetpackStatus({ success: false, error: err?.message || 'Connection failed' });
    }
  };

  const handleJetpackSync = async () => {
    setJetpackSyncing(true);
    setJetpackResult(null);
    try {
      const res = await api.post<any>('/jetpack-crm/sync', { limit: 100 });
      setJetpackResult(res);
      setNotice({
        type: 'success',
        message: `Jetpack CRM Sync completed! Fetched: ${res.totalFetched}, Customers Created: ${res.customersCreated}, Pipeline Leads: ${res.leadsCreated}`,
      });
      void loadJetpackStatus();
    } catch (err: any) {
      setNotice({ type: 'error', message: err?.message || 'Failed to sync from Jetpack CRM' });
    } finally {
      setJetpackSyncing(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const settings = await api.get<Setting[]>('/site-settings');
      const map: Record<string, string> = {};
      for (const s of settings) {
        if (s.value !== null && s.value !== undefined) {
          map[s.key] = s.value;
        }
      }
      setValues(map);
    } catch (err: any) {
      setNotice({ type: 'error', message: err?.message || 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    void loadJetpackStatus();
  }, []);

  const handleToggle = (key: string) => {
    setValues((prev) => {
      const current = prev[key] !== 'false';
      return { ...prev, [key]: current ? 'false' : 'true' };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setNotice(null);
    try {
      // Save all keys that start with automation_ or telegram_
      const keysToSave = Object.keys(values).filter(
        (k) => k.startsWith('automation_') || k.startsWith('telegram_')
      );

      for (const key of keysToSave) {
        await api.patch(`/site-settings/${key}`, { value: values[key] });
      }

      setNotice({ type: 'success', message: 'All sales automations & Telegram settings saved successfully!' });
    } catch (err: any) {
      setNotice({ type: 'error', message: err?.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    setTestingTelegram(true);
    setTelegramResult(null);
    try {
      const botToken = values['telegram_bot_token'] || '';
      const chatId = values['telegram_chat_id'] || '';

      const res = await api.post<{ success: boolean; botName?: string; error?: string }>('/telegram/test', {
        botToken,
        chatId,
      });

      if (res.success) {
        setTelegramResult({
          success: true,
          text: `Verified! Bot: ${res.botName || 'Connected'}. A test notification has been sent to Chat ID ${chatId || '(no chat specified)'}.`,
        });
      } else {
        setTelegramResult({
          success: false,
          text: res.error || 'Connection failed. Please check your bot token and chat ID.',
        });
      }
    } catch (err: any) {
      setTelegramResult({
        success: false,
        text: err?.message || 'Failed to test Telegram bot connection',
      });
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleRunSweep = async () => {
    setRunningSweep(true);
    setSweepResult(null);
    try {
      const res = await api.post<any>('/automation/reminders/run', {});
      setSweepResult(res);
      setNotice({ type: 'success', message: 'Automated sweep executed successfully!' });
    } catch (err: any) {
      setNotice({ type: 'error', message: err?.message || 'Failed to run automated sweep' });
    } finally {
      setRunningSweep(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <Spinner size={32} />
        <p style={{ marginTop: '12px', color: '#64748b' }}>Loading Sales Automation System...</p>
      </div>
    );
  }

  const telegramEnabled = values['telegram_enabled'] !== 'false';
  const activeCount = RULES.filter((r) => values[r.settingKey] !== 'false').length;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '60px' }}>
      <PageHeader
        title="Sales & Operations Automations"
        subtitle="Manage the 12 core sales workflows, automated task SLAs, duplicate detection, and Telegram bot alerts."
        action={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="secondary" onClick={handleRunSweep} disabled={runningSweep}>
              {runningSweep ? <Spinner size={14} /> : '⚡'} Run Sweep Now
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? <Spinner size={14} /> : '💾 Save Automations'}
            </Button>
          </div>
        }
      />

      {notice && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: '10px',
            marginBottom: '24px',
            background: notice.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${notice.type === 'success' ? '#86efac' : '#fca5a5'}`,
            color: notice.type === 'success' ? '#166534' : '#991b1b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '14px',
          }}
        >
          <span>{notice.message}</span>
          <button
            onClick={() => setNotice(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Overview Stats Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Active Rules
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
            {activeCount} / {RULES.length}
          </div>
          <div style={{ fontSize: '13px', color: '#16a34a', marginTop: '4px' }}>Automations operational</div>
        </div>

        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Telegram Notifications
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: telegramEnabled ? '#0284c7' : '#94a3b8', marginTop: '6px' }}>
            {telegramEnabled ? 'Active' : 'Disabled'}
          </div>
          <div style={{ fontSize: '13px', color: values['telegram_chat_id'] ? '#16a34a' : '#ea580c', marginTop: '4px' }}>
            {values['telegram_chat_id'] ? 'Group chat linked' : 'No chat ID configured'}
          </div>
        </div>

        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Watchdog Sweeps
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
            Every 1 Hr
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Background scheduler running</div>
        </div>
      </div>

      {sweepResult && (
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            padding: '16px 20px',
            marginBottom: '24px',
            fontSize: '13px',
          }}
        >
          <strong>Sweep Results:</strong> Departure Reminders: {sweepResult.departureReminders} | Overdue Invoices: {sweepResult.invoiceOverdue} | Payment Reminders: {sweepResult.paymentReminders} | Stale Leads: {sweepResult.leadFollowUps} | Inactivity Escalations: {sweepResult.inactivityEscalations ?? 0}
        </div>
      )}

      {/* WORDPRESS & JETPACK CRM INGESTION CARD */}
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          marginBottom: '28px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '24px' }}>🔌</span>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                WordPress Jetpack CRM &amp; Website Forms Ingestion
              </h2>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: '20px',
                  letterSpacing: '0.04em',
                  background: jetpackStatus?.success ? '#dcfce7' : '#fee2e2',
                  color: jetpackStatus?.success ? '#15803d' : '#b91c1c',
                }}
              >
                {jetpackStatus?.success ? `Connected • v${jetpackStatus.crmVersion || '6.8.4'}` : 'Checking Connection...'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
              Real-time two-way synchronization with WordPress Jetpack CRM and direct API ingestion for Contact Form 7, Elementor Forms, and WPForms.
            </p>
          </div>
          <Button variant="secondary" onClick={handleJetpackSync} disabled={jetpackSyncing}>
            {jetpackSyncing ? <Spinner size={14} /> : '🔄'} Sync from Jetpack CRM Now
          </Button>
        </div>

        {/* Status Highlights */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            marginBottom: '20px',
            background: '#f8fafc',
            padding: '14px 18px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>WordPress Endpoint</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginTop: '2px', wordBreak: 'break-all' }}>
              https://sunseekerstours.com/zbs_api/
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>CRM Database Version</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
              v{jetpackStatus?.crmVersion || '6.8.4'} (DB v{jetpackStatus?.dbVersion || '3.0'})
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Available Contacts in Jetpack</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f766e', marginTop: '2px' }}>
              {jetpackStatus?.contactsAvailable ?? '—'} Live Contacts
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Scheduled Sweep</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a', marginTop: '2px' }}>
              Auto-Sync Every 1 Hour
            </div>
          </div>
        </div>

        {/* Sync Result Banner */}
        {jetpackResult && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: '#f0fdf4',
              border: '1px solid #86efac',
              color: '#166534',
              fontSize: '13px',
              marginBottom: '20px',
            }}
          >
            <strong>✅ Import Succeeded:</strong> Fetched {jetpackResult.totalFetched} contacts from Jetpack CRM. Created {jetpackResult.customersCreated} customers and {jetpackResult.leadsCreated} sales pipeline leads with automated agent assignment.
          </div>
        )}

        {/* Inbound Webhook Box */}
        <div
          style={{
            border: '1px dashed #cbd5e1',
            borderRadius: '12px',
            padding: '18px',
            background: '#fafafa',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                🌐 Live Inbound Webhook for WordPress Forms
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', maxWidth: '720px' }}>
                Send POST requests directly to this webhook whenever a visitor submits an inquiry or booking form on <strong>sunseekerstours.com</strong>.
                The system automatically deduplicates the customer, creates a new pipeline lead, assigns a sales agent via round-robin, creates a 2-hour SLA response task, and pushes the contact to Jetpack CRM.
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  const url = `${window.location.protocol}//${window.location.hostname}:3000/api/v1/jetpack-crm/webhook`;
                  navigator.clipboard.writeText(url);
                }
                setCopiedWebhook(true);
                setTimeout(() => setCopiedWebhook(false), 2500);
              }}
            >
              {copiedWebhook ? '✓ Webhook URL Copied!' : '📋 Copy Webhook URL'}
            </Button>
          </div>

          <div
            style={{
              marginTop: '12px',
              background: '#1e293b',
              color: '#38bdf8',
              padding: '10px 14px',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '13px',
              wordBreak: 'break-all',
              userSelect: 'all',
            }}
          >
            POST http://localhost:3000/api/v1/jetpack-crm/webhook
          </div>

          <div style={{ marginTop: '12px', fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>
            <strong>Accepted Form Fields (JSON or Form URL-encoded):</strong> <code>first_name</code>, <code>last_name</code> (or <code>name</code>/<code>full_name</code>), <code>email</code> (required), <code>phone</code>, <code>tour</code> (or <code>interestedTour</code>), <code>dates</code>, <code>passengers</code>, <code>message</code>.
            <br />
            Supports Contact Form 7 (with Webhook extension), Elementor Pro Forms (Webhook action), WPForms, and custom WordPress hooks.
          </div>
        </div>
      </div>

      {/* TELEGRAM BOT CONFIGURATION CARD */}
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          marginBottom: '32px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '24px' }}>🤖</span>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Telegram Bot Integration &amp; Alert Routing
              </h2>
            </div>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
              Notify staff instantly on Telegram for new leads, won deals, confirmed payments, and inactivity alerts.
            </p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
            <span>{telegramEnabled ? 'Enabled' : 'Disabled'}</span>
            <input
              type="checkbox"
              checked={telegramEnabled}
              onChange={() => handleToggle('telegram_enabled')}
              style={{ width: '20px', height: '20px', accentColor: 'var(--brand, #0f766e)' }}
            />
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Telegram Bot Token
            </label>
            <input
              type="password"
              placeholder="e.g. 7123456789:ABCdefGhIJKlmNoPQRstuvWXyz..."
              value={values['telegram_bot_token'] || ''}
              onChange={(e) => setValues({ ...values, telegram_bot_token: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                fontFamily: 'monospace',
              }}
            />
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Obtained via @BotFather in Telegram.</span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Telegram Group / Channel Chat ID
            </label>
            <input
              type="text"
              placeholder="e.g. -1001234567890 or @SunseekersSales"
              value={values['telegram_chat_id'] || ''}
              onChange={(e) => setValues({ ...values, telegram_chat_id: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                fontFamily: 'monospace',
              }}
            />
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Target group or channel where alerts should be posted.</span>
          </div>
        </div>

        <div style={{ marginTop: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Button variant="secondary" onClick={handleTestTelegram} disabled={testingTelegram}>
            {testingTelegram ? <Spinner size={14} /> : '📡 Test Telegram Bot Ping'}
          </Button>
          {telegramResult && (
            <span
              style={{
                fontSize: '13px',
                color: telegramResult.success ? '#16a34a' : '#dc2626',
                fontWeight: 600,
              }}
            >
              {telegramResult.success ? '✅ ' : '❌ '}
              {telegramResult.text}
            </span>
          )}
        </div>
      </div>

      {/* 12 CORE AUTOMATION CARDS WITH DYNAMIC PROPER SETTINGS */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 16px', color: '#0f172a' }}>
          Configured Sales Workflows ({RULES.length})
        </h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {RULES.map((rule) => {
          const isEnabled = values[rule.settingKey] !== 'false';

          return (
            <div
              key={rule.id}
              style={{
                background: 'white',
                borderRadius: '14px',
                padding: '22px 26px',
                border: isEnabled ? '1px solid #cbd5e1' : '1px dashed #cbd5e1',
                boxShadow: isEnabled ? '0 1px 3px rgba(0,0,0,0.04)' : 'none',
                opacity: isEnabled ? 1 : 0.75,
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, paddingRight: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span
                      style={{
                        background: '#f1f5f9',
                        color: '#475569',
                        fontWeight: 700,
                        fontSize: '12px',
                        padding: '2px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      #{rule.number}
                    </span>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                      {rule.title}
                    </h3>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background:
                          rule.badge === 'Event-Driven'
                            ? '#e0f2fe'
                            : rule.badge === 'Pre-Check'
                            ? '#fef3c7'
                            : '#f3e8ff',
                        color:
                          rule.badge === 'Event-Driven'
                            ? '#0369a1'
                            : rule.badge === 'Pre-Check'
                            ? '#92400e'
                            : '#7e22ce',
                      }}
                    >
                      {rule.badge}
                    </span>
                  </div>

                  <p style={{ margin: '0 0 12px', color: '#475569', fontSize: '14px', lineHeight: 1.5 }}>
                    {rule.summary}
                  </p>

                  <div
                    style={{
                      background: '#f8fafc',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      fontSize: '12px',
                      color: '#64748b',
                      borderLeft: '3px solid #0284c7',
                      marginBottom: rule.inputs && rule.inputs.length > 0 ? '14px' : '0',
                    }}
                  >
                    <strong>Workflow:</strong> {rule.example}
                  </div>

                  {/* Configurable Parameters for this automation */}
                  {rule.inputs && rule.inputs.length > 0 && (
                    <div
                      style={{
                        background: '#f1f5f9',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: '16px',
                      }}
                    >
                      {rule.inputs.map((inp) => (
                        <div key={inp.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                            {inp.label}:
                          </label>

                          {inp.type === 'number' && (
                            <input
                              type="number"
                              min="1"
                              max="365"
                              value={values[inp.key] ?? inp.defaultVal}
                              onChange={(e) => setValues({ ...values, [inp.key]: e.target.value })}
                              style={{
                                width: '75px',
                                padding: '5px 8px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '13px',
                                textAlign: 'center',
                                background: 'white',
                              }}
                            />
                          )}

                          {inp.type === 'select' && inp.options && (
                            <select
                              value={values[inp.key] ?? inp.defaultVal}
                              onChange={(e) => setValues({ ...values, [inp.key]: e.target.value })}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '13px',
                                background: 'white',
                                color: '#1e293b',
                              }}
                            >
                              {inp.options.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          )}

                          {inp.unit && (
                            <span style={{ fontSize: '12px', color: '#64748b' }}>{inp.unit}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Toggle switch */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: isEnabled ? '#16a34a' : '#94a3b8' }}>
                      {isEnabled ? 'Active' : 'Disabled'}
                    </span>
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => handleToggle(rule.settingKey)}
                      style={{ width: '22px', height: '22px', accentColor: 'var(--brand, #0f766e)' }}
                    />
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Save Button Bar */}
      <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <Button variant="secondary" onClick={handleRunSweep} disabled={runningSweep}>
          {runningSweep ? <Spinner size={14} /> : '⚡'} Run Sweep Now
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? <Spinner size={14} /> : '💾 Save All Changes'}
        </Button>
      </div>
    </div>
  );
}
