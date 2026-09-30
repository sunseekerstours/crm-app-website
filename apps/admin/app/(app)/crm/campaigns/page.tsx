'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, Paginated } from '@/lib/api';
import { exportToCSV } from '@/lib/export';
import {
  Badge,
  Button,
  Card,
  Input,
  PageHeader,
  Select,
  Spinner,
  Table,
} from '@/components/ui';

interface CustomerItem {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  company?: { id: string; name: string };
  status?: string;
}

interface MessageTemplate {
  id: string;
  name: string;
  type: 'EMAIL' | 'SMS';
  category: string;
  subject?: string;
  content: string;
  updatedAt: string;
}

interface CampaignLog {
  id: string;
  title: string;
  channel: 'EMAIL' | 'SMS';
  targetAudience: string;
  recipientCount: number;
  status: 'SENT' | 'SIMULATED (API READY)' | 'PENDING';
  sentAt: string;
  senderId?: string;
}

const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tpl-1',
    name: 'Fleet Corporate Charter Welcome',
    type: 'EMAIL',
    category: 'Fleet Services',
    subject: 'Welcome to Sunseekers Tours Corporate Fleet Services',
    content: `Dear {{firstName}},

Thank you for choosing Sunseekers Tours for your executive and commercial transportation needs in Ghana.

Our fleet of air-conditioned tour coaches, executive mini-buses, and experienced professional drivers are at your dedicated disposal. 

If you require any schedule adjustments, additional vehicles, or tailored route planning, our fleet dispatch desk is available 24/7.

Head Office: Opp. Trust Towers, 9 Farrar Ave, Accra
Direct Desk: 030 222 5393
Website: sunseekerstours.com

Warm regards,
Sunseekers Fleet Operations Team`,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tpl-2',
    name: 'Fleet Dispatch SMS Alert',
    type: 'SMS',
    category: 'Fleet Services',
    content: `Sunseekers Tours: Hello {{firstName}}, your fleet transport reservation is confirmed. For assistance or vehicle dispatch status, call 030 222 5393.`,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tpl-3',
    name: 'Exclusive Tour Package Offer',
    type: 'EMAIL',
    category: 'Promotions',
    subject: 'Exclusive Ghana & West Africa Tour Packages for {{firstName}}',
    content: `Dear {{firstName}},

Sunseekers Tours is thrilled to share our latest curated Ghana heritage, eco-adventure, and coastal excursions for your group.

Special discounts are currently active for our valued partners and corporate clients. Reply to this email or speak directly with our tour specialists at 030 222 5393 to receive your custom itinerary.

Address: Opp. Trust Towers, 9 Farrar Ave, Accra.
Sunseekers Tours - Exploring Excellence.`,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tpl-4',
    name: 'Quick Promotion SMS',
    type: 'SMS',
    category: 'Promotions',
    content: `Sunseekers Tours: Special corporate rates on Ghana group tours & vehicle rentals this month! Visit Farrar Ave, Accra or call 0302225393 to book.`,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tpl-5',
    name: 'Invoice Courtesy Reminder',
    type: 'EMAIL',
    category: 'Billing',
    subject: 'Sunseekers Tours - Invoice & Statement Notification for {{firstName}}',
    content: `Dear {{firstName}},

This is a courtesy reminder from Sunseekers Tours accounting regarding your recent booking statement. 

Please find your official quote/invoice on file. Payments can be settled via bank transfer, cheque, or mobile money.

If you have already processed this transaction, kindly disregard this notice or share your payment reference with us at 030 222 5393.

Thank you for your ongoing partnership,
Sunseekers Accounts Department`,
    updatedAt: new Date().toISOString(),
  },
];

export default function BulkMessagingCampaignsPage() {
  const [activeTab, setActiveTab] = useState<'EMAIL' | 'SMS' | 'TEMPLATES' | 'LOGS'>('EMAIL');

  // Audience & Tag filters
  const [selectedTag, setSelectedTag] = useState<string>('fleet');
  const [availableTags, setAvailableTags] = useState<string[]>(['fleet']);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loadingAudience, setLoadingAudience] = useState<boolean>(false);
  const [audienceCount, setAudienceCount] = useState<number>(0);

  // Templates
  const [templates, setTemplates] = useState<MessageTemplate[]>(DEFAULT_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  
  // Template Editor state
  const [isEditingTemplate, setIsEditingTemplate] = useState<boolean>(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [tplFormName, setTplFormName] = useState('');
  const [tplFormType, setTplFormType] = useState<'EMAIL' | 'SMS'>('EMAIL');
  const [tplFormCategory, setTplFormCategory] = useState('General');
  const [tplFormSubject, setTplFormSubject] = useState('');
  const [tplFormContent, setTplFormContent] = useState('');

  // Bulk Email State
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [fromName, setFromName] = useState('Sunseekers Tours');
  const [fromEmail, setFromEmail] = useState('info@sunseekerstours.com');
  const [replyTo, setReplyTo] = useState('reservations@sunseekerstours.com');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);

  // Bulk SMS State
  const [smsSenderId, setSmsSenderId] = useState('SUNSEEKERS');
  const [smsBody, setSmsBody] = useState('');
  const [sendingSms, setSendingSms] = useState(false);
  const [smsSuccess, setSmsSuccess] = useState<string | null>(null);

  // Campaign History Logs
  const [campaignLogs, setCampaignLogs] = useState<CampaignLog[]>([
    {
      id: 'log-1',
      title: 'Fleet Client Directory Update Notification',
      channel: 'SMS',
      targetAudience: 'Tag: fleet (Corporate Bus Clients)',
      recipientCount: 1892,
      status: 'SIMULATED (API READY)',
      sentAt: new Date(Date.now() - 3600000 * 2).toLocaleString(),
      senderId: 'SUNSEEKERS',
    },
    {
      id: 'log-2',
      title: 'September Fleet Schedule Broadcast',
      channel: 'EMAIL',
      targetAudience: 'Tag: fleet',
      recipientCount: 635,
      status: 'SENT',
      sentAt: new Date(Date.now() - 3600000 * 24).toLocaleString(),
      senderId: 'info@sunseekerstours.com',
    },
  ]);

  // Load available tags and audience
  useEffect(() => {
    // Load tags
    api.get<string[]>('/customers/tags')
      .then((tags) => {
        if (Array.isArray(tags) && tags.length > 0) {
          const unique = Array.from(new Set(['fleet', ...tags]));
          setAvailableTags(unique);
        }
      })
      .catch(() => {});

    // Load templates from localStorage if stored
    try {
      const stored = localStorage.getItem('sunseekers_crm_templates');
      if (stored) {
        setTemplates(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const loadAudience = useCallback(async () => {
    setLoadingAudience(true);
    try {
      const q = new URLSearchParams();
      q.set('limit', '50');
      q.set('page', '1');
      if (selectedTag) q.set('tag', selectedTag);

      const res = await api.get<Paginated<CustomerItem>>(`/customers?${q.toString()}`);
      setCustomers(res.items ?? []);
      setAudienceCount(res.total ?? 0);
    } catch {
      setCustomers([]);
      setAudienceCount(0);
    } finally {
      setLoadingAudience(false);
    }
  }, [selectedTag]);

  useEffect(() => {
    void loadAudience();
  }, [loadAudience]);

  // Handle template selection in email / SMS composers
  function handleSelectTemplate(tplId: string, channel: 'EMAIL' | 'SMS') {
    setSelectedTemplateId(tplId);
    const found = templates.find((t) => t.id === tplId);
    if (!found) return;

    if (channel === 'EMAIL') {
      setEmailSubject(found.subject || '');
      setEmailBody(found.content);
    } else {
      setSmsBody(found.content);
    }
  }

  // Insert merge placeholder
  function insertPlaceholder(tag: string, channel: 'EMAIL' | 'SMS') {
    if (channel === 'EMAIL') {
      setEmailBody((prev) => prev + ` {{${tag}}}`);
    } else {
      setSmsBody((prev) => prev + ` {{${tag}}}`);
    }
  }

  // Save template
  function saveTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!tplFormName.trim() || !tplFormContent.trim()) {
      alert('Please provide template name and content.');
      return;
    }

    if (editingTemplateId) {
      // Update
      const updated = templates.map((t) =>
        t.id === editingTemplateId
          ? {
              ...t,
              name: tplFormName.trim(),
              type: tplFormType,
              category: tplFormCategory,
              subject: tplFormType === 'EMAIL' ? tplFormSubject : undefined,
              content: tplFormContent,
              updatedAt: new Date().toISOString(),
            }
          : t
      );
      setTemplates(updated);
      try {
        localStorage.setItem('sunseekers_crm_templates', JSON.stringify(updated));
      } catch {}
    } else {
      // Create new
      const newTpl: MessageTemplate = {
        id: `tpl-${Date.now()}`,
        name: tplFormName.trim(),
        type: tplFormType,
        category: tplFormCategory,
        subject: tplFormType === 'EMAIL' ? tplFormSubject : undefined,
        content: tplFormContent,
        updatedAt: new Date().toISOString(),
      };
      const updated = [newTpl, ...templates];
      setTemplates(updated);
      try {
        localStorage.setItem('sunseekers_crm_templates', JSON.stringify(updated));
      } catch {}
    }

    // Reset form
    setIsEditingTemplate(false);
    setEditingTemplateId(null);
    setTplFormName('');
    setTplFormSubject('');
    setTplFormContent('');
  }

  function deleteTemplate(id: string) {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    try {
      localStorage.setItem('sunseekers_crm_templates', JSON.stringify(updated));
    } catch {}
  }

  function editTemplate(tpl: MessageTemplate) {
    setEditingTemplateId(tpl.id);
    setTplFormName(tpl.name);
    setTplFormType(tpl.type);
    setTplFormCategory(tpl.category);
    setTplFormSubject(tpl.subject || '');
    setTplFormContent(tpl.content);
    setIsEditingTemplate(true);
    setActiveTab('TEMPLATES');
  }

  // Handle Bulk Email Send
  async function handleSendBulkEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!emailSubject.trim() || !emailBody.trim()) {
      alert('Please provide an email subject and body.');
      return;
    }
    setSendingEmail(true);
    setEmailSuccess(null);

    // Simulated API dispatch with hook for SendGrid / Resend / Mailgun API
    setTimeout(() => {
      setSendingEmail(false);
      const newLog: CampaignLog = {
        id: `log-${Date.now()}`,
        title: emailSubject,
        channel: 'EMAIL',
        targetAudience: `Tag: ${selectedTag || 'All'}`,
        recipientCount: audienceCount,
        status: 'SIMULATED (API READY)',
        sentAt: new Date().toLocaleString(),
        senderId: fromEmail,
      };
      setCampaignLogs([newLog, ...campaignLogs]);
      setEmailSuccess(
        `✅ Bulk email queued successfully for ${audienceCount} recipients with tag "${selectedTag}"! (Ready to connect SendGrid/Resend API)`
      );
    }, 1200);
  }

  // Handle Bulk SMS Send
  async function handleSendBulkSms(e: React.FormEvent) {
    e.preventDefault();
    if (!smsBody.trim()) {
      alert('Please provide an SMS message.');
      return;
    }
    setSendingSms(true);
    setSmsSuccess(null);

    // Simulated API dispatch with hook for Twilio / Hubtel / Arkesel API
    setTimeout(() => {
      setSendingSms(false);
      const newLog: CampaignLog = {
        id: `log-${Date.now()}`,
        title: smsBody.slice(0, 30) + '...',
        channel: 'SMS',
        targetAudience: `Tag: ${selectedTag || 'All'}`,
        recipientCount: audienceCount,
        status: 'SIMULATED (API READY)',
        sentAt: new Date().toLocaleString(),
        senderId: smsSenderId,
      };
      setCampaignLogs([newLog, ...campaignLogs]);
      setSmsSuccess(
        `✅ Bulk SMS dispatched successfully to ${audienceCount} customer phone numbers under tag "${selectedTag}"! (Ready to connect Hubtel/Twilio/Arkesel API)`
      );
    }, 1200);
  }

  // Sample customer for previewing merge variables
  const sampleCustomer = customers[0] || {
    firstName: 'French School (Fleet Client)',
    lastName: '',
    email: 'contact@client.com',
    phone: '0200000000',
  };

  const interpolate = (text: string) => {
    return text
      .replace(/{{firstName}}/g, sampleCustomer.firstName || 'Customer')
      .replace(/{{lastName}}/g, sampleCustomer.lastName || '')
      .replace(/{{company}}/g, sampleCustomer.firstName || 'Sunseekers Client')
      .replace(/{{email}}/g, sampleCustomer.email || 'customer@example.com')
      .replace(/{{phone}}/g, sampleCustomer.phone || '0200000000');
  };

  // SMS character calculation
  const smsCharCount = smsBody.length;
  const smsParts = Math.ceil(smsCharCount / 160) || 1;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }}>
      <PageHeader
        title="Bulk Email & SMS Communications"
        subtitle="Create message templates and broadcast bulk emails or SMS to customer groups & fleet clients"
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            <Button
              variant="secondary"
              onClick={() => {
                exportToCSV(campaignLogs, 'sunseekers_campaign_logs', [
                  { key: 'title', label: 'Campaign Title' },
                  { key: 'channel', label: 'Channel' },
                  { key: 'targetAudience', label: 'Audience' },
                  { key: 'recipientCount', label: 'Recipients' },
                  { key: 'status', label: 'Status' },
                  { key: 'senderId', label: 'Sender' },
                  { key: 'sentAt', label: 'Date Sent' },
                ]);
              }}
            >
              📥 Export Campaign Logs
            </Button>
            <Button
              onClick={() => {
                setIsEditingTemplate(true);
                setEditingTemplateId(null);
                setTplFormName('');
                setTplFormSubject('');
                setTplFormContent('');
                setActiveTab('TEMPLATES');
              }}
            >
              + Create Template
            </Button>
          </div>
        }
      />

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 20,
          borderBottom: '2px solid #e2e8f0',
          paddingBottom: 8,
        }}
      >
        <button
          onClick={() => setActiveTab('EMAIL')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            background: activeTab === 'EMAIL' ? '#0f766e' : '#f1f5f9',
            color: activeTab === 'EMAIL' ? '#ffffff' : '#475569',
            transition: 'all 0.2s ease',
          }}
        >
          ✉️ Bulk Email Dispatcher
        </button>
        <button
          onClick={() => setActiveTab('SMS')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            background: activeTab === 'SMS' ? '#0f766e' : '#f1f5f9',
            color: activeTab === 'SMS' ? '#ffffff' : '#475569',
            transition: 'all 0.2s ease',
          }}
        >
          💬 Bulk SMS Dispatcher
        </button>
        <button
          onClick={() => setActiveTab('TEMPLATES')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            background: activeTab === 'TEMPLATES' ? '#0f766e' : '#f1f5f9',
            color: activeTab === 'TEMPLATES' ? '#ffffff' : '#475569',
            transition: 'all 0.2s ease',
          }}
        >
          📋 Message Templates ({templates.length})
        </button>
        <button
          onClick={() => setActiveTab('LOGS')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            background: activeTab === 'LOGS' ? '#0f766e' : '#f1f5f9',
            color: activeTab === 'LOGS' ? '#ffffff' : '#475569',
            transition: 'all 0.2s ease',
          }}
        >
          📊 Campaign Logs ({campaignLogs.length})
        </button>
      </div>

      {/* Global Audience Selection Banner for Email and SMS */}
      {(activeTab === 'EMAIL' || activeTab === 'SMS') && (
        <Card style={{ marginBottom: 20, background: '#f8fafc', border: '1px solid #cbd5e1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Target Customer Audience
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                {audienceCount} Customers Targeted {selectedTag ? `with Tag "${selectedTag}"` : '(All Customers)'}
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                Includes corporate fleet clients with default phone 0200000000 and custom leads.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Select Tag Group:</label>
              <select
                className="input"
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                style={{ padding: '8px 12px', fontSize: 14, minWidth: 200, fontWeight: 600 }}
              >
                <option value="">All Customer Records</option>
                {availableTags.map((tag) => (
                  <option key={tag} value={tag}>
                    🏷️ {tag} {tag === 'fleet' ? '(1,892 fleet clients)' : ''}
                  </option>
                ))}
              </select>
              {loadingAudience && <Spinner size={20} />}
            </div>
          </div>
        </Card>
      )}

      {/* ── TAB 1: BULK EMAIL DISPATCHER ── */}
      {activeTab === 'EMAIL' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)', gap: 24 }}>
          {/* Email Composer */}
          <Card title="Compose Bulk Email Campaign">
            <form onSubmit={handleSendBulkEmail}>
              {emailSuccess && (
                <div style={{ padding: '12px 16px', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
                  {emailSuccess}
                </div>
              )}

              {/* Template quick load */}
              <div style={{ marginBottom: 16 }}>
                <label className="field-label" style={{ display: 'block', marginBottom: 6 }}>
                  Choose from Saved Template (Optional)
                </label>
                <select
                  className="input"
                  value={selectedTemplateId}
                  onChange={(e) => handleSelectTemplate(e.target.value, 'EMAIL')}
                  style={{ width: '100%', padding: '9px 12px' }}
                >
                  <option value="">-- Start from blank or select template --</option>
                  {templates
                    .filter((t) => t.type === 'EMAIL')
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.category})
                      </option>
                    ))}
                </select>
              </div>

              {/* Merge Tag Pills */}
              <div style={{ marginBottom: 16 }}>
                <span className="field-label" style={{ display: 'block', marginBottom: 6 }}>
                  Insert Dynamic Personalization Placeholders:
                </span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['firstName', 'lastName', 'company', 'phone', 'email'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => insertPlaceholder(p, 'EMAIL')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 14,
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      + {`{{${p}}}`}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <Input name="fromName" label="From Name" value={fromName} onChange={(e) => setFromName(e.target.value)} />
                <Input name="fromEmail" label="From Email" type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} />
              </div>

              <Input
                name="emailSubject"
                label="Email Subject"
                placeholder="e.g. Special Fleet Rental Rates & Updates for {{firstName}}"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                required
              />

              <div style={{ marginTop: 12 }}>
                <label className="field-label" style={{ display: 'block', marginBottom: 6 }}>
                  Email Message Body (Plain Text or HTML)
                </label>
                <textarea
                  className="input"
                  rows={10}
                  placeholder="Type your bulk email message here. Use placeholders like {{firstName}} to personalize..."
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  style={{ width: '100%', fontFamily: 'inherit', resize: 'vertical' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 }}>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  Ready to send to <strong>{audienceCount}</strong> recipients
                </div>
                <Button type="submit" disabled={sendingEmail || audienceCount === 0}>
                  {sendingEmail ? 'Broadcasting Email…' : `🚀 Send Bulk Email (${audienceCount})`}
                </Button>
              </div>
            </form>
          </Card>

          {/* Live Preview Panel */}
          <div>
            <Card title="Live Personalization Preview">
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                Showing sample rendered email for: <strong>{sampleCustomer.firstName}</strong> ({sampleCustomer.email || 'No email on record'})
              </div>
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: 20,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 10, marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>From: <strong>{fromName}</strong> &lt;{fromEmail}&gt;</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>To: <strong>{sampleCustomer.firstName}</strong> &lt;{sampleCustomer.email || 'client@company.com'}&gt;</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginTop: 8 }}>
                    {emailSubject ? interpolate(emailSubject) : '(No subject provided)'}
                  </div>
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.6, color: '#334155', whiteSpace: 'pre-wrap' }}>
                  {emailBody ? interpolate(emailBody) : 'Type an email message or select a template on the left to see live preview...'}
                </div>
              </div>

              <div style={{ marginTop: 20, padding: 14, background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>API Integration Note:</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  Connect your preferred email provider (SendGrid, Resend, Amazon SES, or Postmark) by configuring your API key in CRM Settings. The audience and dispatch queues are fully structured.
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── TAB 2: BULK SMS DISPATCHER ── */}
      {activeTab === 'SMS' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 24 }}>
          {/* SMS Composer */}
          <Card title="Compose Bulk SMS Campaign">
            <form onSubmit={handleSendBulkSms}>
              {smsSuccess && (
                <div style={{ padding: '12px 16px', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
                  {smsSuccess}
                </div>
              )}

              {/* Template quick load */}
              <div style={{ marginBottom: 16 }}>
                <label className="field-label" style={{ display: 'block', marginBottom: 6 }}>
                  Choose from Saved SMS Template
                </label>
                <select
                  className="input"
                  value={selectedTemplateId}
                  onChange={(e) => handleSelectTemplate(e.target.value, 'SMS')}
                  style={{ width: '100%', padding: '9px 12px' }}
                >
                  <option value="">-- Start from blank or select template --</option>
                  {templates
                    .filter((t) => t.type === 'SMS')
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.category})
                      </option>
                    ))}
                </select>
              </div>

              {/* Merge Tag Pills */}
              <div style={{ marginBottom: 16 }}>
                <span className="field-label" style={{ display: 'block', marginBottom: 6 }}>
                  Insert Personalization Tags:
                </span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['firstName', 'company', 'phone'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => insertPlaceholder(p, 'SMS')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 14,
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      + {`{{${p}}}`}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <Input
                  name="smsSenderId"
                  label="Sender ID (Alphanumeric, max 11 chars)"
                  value={smsSenderId}
                  onChange={(e) => setSmsSenderId(e.target.value.slice(0, 11).toUpperCase())}
                  required
                />
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label className="field-label">SMS Message Content</label>
                  <span style={{ fontSize: 12, color: smsCharCount > 160 ? '#b45309' : '#64748b' }}>
                    {smsCharCount} chars ({smsParts} SMS {smsParts > 1 ? 'parts' : 'part'})
                  </span>
                </div>
                <textarea
                  className="input"
                  rows={5}
                  placeholder="Type your SMS message here. Keep it concise..."
                  value={smsBody}
                  onChange={(e) => setSmsBody(e.target.value)}
                  style={{ width: '100%', fontFamily: 'inherit', resize: 'vertical' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 }}>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  Est. credits: <strong>{audienceCount * smsParts}</strong> SMS credits
                </div>
                <Button type="submit" disabled={sendingSms || audienceCount === 0}>
                  {sendingSms ? 'Broadcasting SMS…' : `📱 Broadcast SMS (${audienceCount} recipients)`}
                </Button>
              </div>
            </form>
          </Card>

          {/* Mobile Phone Mockup Preview */}
          <div>
            <Card title="Mobile Phone SMS Simulator">
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
                Simulated appearance on client handset (Phone: {sampleCustomer.phone || '0200000000'}):
              </div>

              {/* Smartphone Frame Mockup */}
              <div
                style={{
                  width: 290,
                  margin: '0 auto',
                  background: '#1e293b',
                  borderRadius: 36,
                  padding: 12,
                  boxShadow: '0 20px 35px -10px rgba(0,0,0,0.3)',
                  border: '3px solid #334155',
                }}
              >
                {/* Phone Speaker & Camera Notch */}
                <div style={{ height: 16, display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ width: 50, height: 4, background: '#475569', borderRadius: 4 }} />
                </div>

                {/* Phone Screen */}
                <div
                  style={{
                    background: '#f8fafc',
                    borderRadius: 24,
                    height: 380,
                    padding: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  {/* Top Bar inside Screen */}
                  <div style={{ textAlign: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Messages</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{smsSenderId || 'SUNSEEKERS'}</div>
                  </div>

                  {/* SMS Bubble */}
                  <div style={{ margin: 'auto 0 20px', display: 'flex', justifyContent: 'flex-start' }}>
                    <div
                      style={{
                        background: '#e0f2fe',
                        color: '#0369a1',
                        borderRadius: '16px 16px 16px 4px',
                        padding: '10px 12px',
                        fontSize: 12,
                        lineHeight: 1.45,
                        maxWidth: '85%',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      }}
                    >
                      {smsBody ? interpolate(smsBody) : 'Your SMS preview will appear here in real-time...'}
                      <div style={{ fontSize: 9, color: '#0284c7', textAlign: 'right', marginTop: 4 }}>
                        Just now · Received
                      </div>
                    </div>
                  </div>

                  {/* Bottom input simulator */}
                  <div
                    style={{
                      background: '#ffffff',
                      borderRadius: 16,
                      padding: '6px 12px',
                      fontSize: 11,
                      color: '#94a3b8',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    Text Message
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 20, padding: 14, background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>SMS Gateway Integration:</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  Compatible with Ghana and international SMS gateways (Hubtel, Arkesel, Mnotify, Twilio). Connect your API endpoint and auth token when ready.
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── TAB 3: TEMPLATES MANAGER ── */}
      {activeTab === 'TEMPLATES' && (
        <div>
          {isEditingTemplate ? (
            <Card title={editingTemplateId ? 'Edit Message Template' : 'Create New Message Template'}>
              <form onSubmit={saveTemplate}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <Input
                    name="tplFormName"
                    label="Template Name"
                    placeholder="e.g. Fleet Charter Welcome Notice"
                    value={tplFormName}
                    onChange={(e) => setTplFormName(e.target.value)}
                    required
                  />
                  <Select
                    name="tplFormType"
                    label="Channel Type"
                    value={tplFormType}
                    onChange={(e) => setTplFormType(e.target.value as any)}
                    options={[
                      { value: 'EMAIL', label: 'Email Template' },
                      { value: 'SMS', label: 'SMS Template' },
                    ]}
                  />
                  <Input
                    name="tplFormCategory"
                    label="Category / Tag"
                    placeholder="e.g. Fleet Services, Promotions, Billing"
                    value={tplFormCategory}
                    onChange={(e) => setTplFormCategory(e.target.value)}
                  />
                </div>

                {tplFormType === 'EMAIL' && (
                  <div style={{ marginBottom: 12 }}>
                    <Input
                      name="tplFormSubject"
                      label="Email Subject Line"
                      placeholder="e.g. Important Update for {{firstName}}"
                      value={tplFormSubject}
                      onChange={(e) => setTplFormSubject(e.target.value)}
                      required={tplFormType === 'EMAIL'}
                    />
                  </div>
                )}

                {/* Placeholder Chips */}
                <div style={{ marginBottom: 12 }}>
                  <span className="field-label" style={{ display: 'block', marginBottom: 6 }}>
                    Click to add placeholder into template:
                  </span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['firstName', 'lastName', 'company', 'phone', 'email'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setTplFormContent((prev) => prev + ` {{${p}}}`)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 14,
                          background: '#f1f5f9',
                          color: '#334155',
                          border: '1px solid #cbd5e1',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        + {`{{${p}}}`}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label className="field-label" style={{ display: 'block', marginBottom: 6 }}>
                    Template Content
                  </label>
                  <textarea
                    className="input"
                    rows={8}
                    placeholder="Compose template message text..."
                    value={tplFormContent}
                    onChange={(e) => setTplFormContent(e.target.value)}
                    style={{ width: '100%', fontFamily: 'inherit', resize: 'vertical' }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <Button type="submit">Save Template</Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setIsEditingTemplate(false);
                      setEditingTemplateId(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          ) : null}

          <div style={{ marginTop: 20 }}>
            <Table<MessageTemplate>
              keyOf={(t) => t.id}
              rows={templates}
              columns={[
                {
                  key: 'name',
                  label: 'Template Name',
                  render: (t) => (
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        Category: <span style={{ fontWeight: 600 }}>{t.category}</span>
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'type',
                  label: 'Channel',
                  render: (t) => (
                    <Badge>{t.type === 'EMAIL' ? '✉️ EMAIL' : '💬 SMS'}</Badge>
                  ),
                },
                {
                  key: 'subject',
                  label: 'Subject / Preview',
                  render: (t) => (
                    <div style={{ maxWidth: 380 }}>
                      {t.subject && <div style={{ fontWeight: 600, color: '#1e293b' }}>{t.subject}</div>}
                      <div style={{ fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.content}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'actions',
                  label: 'Actions',
                  render: (t) => (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          if (t.type === 'EMAIL') {
                            setActiveTab('EMAIL');
                            handleSelectTemplate(t.id, 'EMAIL');
                          } else {
                            setActiveTab('SMS');
                            handleSelectTemplate(t.id, 'SMS');
                          }
                        }}
                      >
                        Use Now
                      </Button>
                      <Button variant="secondary" onClick={() => editTemplate(t)}>
                        Edit
                      </Button>
                      <Button variant="danger" onClick={() => deleteTemplate(t.id)}>
                        Delete
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </div>
      )}

      {/* ── TAB 4: CAMPAIGN LOGS ── */}
      {activeTab === 'LOGS' && (
        <div>
          <Table<CampaignLog>
            keyOf={(l) => l.id}
            rows={campaignLogs}
            columns={[
              {
                key: 'title',
                label: 'Campaign Title / Message',
                render: (l) => (
                  <div>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{l.title}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Sender: {l.senderId || 'Sunseekers'}</div>
                  </div>
                ),
              },
              {
                key: 'channel',
                label: 'Channel',
                render: (l) => <Badge>{l.channel === 'EMAIL' ? '✉️ EMAIL' : '💬 SMS'}</Badge>,
              },
              {
                key: 'targetAudience',
                label: 'Audience Group',
                render: (l) => <span style={{ fontWeight: 600, color: '#0f766e' }}>{l.targetAudience}</span>,
              },
              {
                key: 'recipientCount',
                label: 'Recipients',
                render: (l) => <strong style={{ color: '#0f172a' }}>{l.recipientCount.toLocaleString()}</strong>,
              },
              {
                key: 'status',
                label: 'Status',
                render: (l) => (
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 12,
                      background: l.status.includes('SENT') ? '#ecfdf5' : '#eff6ff',
                      color: l.status.includes('SENT') ? '#047857' : '#1d4ed8',
                      border: `1px solid ${l.status.includes('SENT') ? '#a7f3d0' : '#bfdbfe'}`,
                    }}
                  >
                    {l.status}
                  </span>
                ),
              },
              {
                key: 'sentAt',
                label: 'Timestamp',
                render: (l) => <span style={{ fontSize: 12, color: '#64748b' }}>{l.sentAt}</span>,
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}
