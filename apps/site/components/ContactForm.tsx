'use client';

import { useState } from 'react';
import { apiPost } from '@/lib/api';

export default function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    destination: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiPost('/public/inquiries', {
        serviceType: 'GENERAL',
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        destination: formData.destination,
        message: formData.message,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit enquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <div style={{ fontSize: '40px', marginBottom: '8px' }}>📬</div>
        <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--brand)', margin: '0 0 6px' }}>
          Message Sent Successfully!
        </h3>
        <p style={{ color: '#475569', fontSize: '14px', margin: '0 0 16px', lineHeight: 1.6 }}>
          Thank you, <strong>{formData.fullName}</strong>. Your message has been received by our travel desk and we will contact you shortly.
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setFormData({ fullName: '', email: '', phone: '', destination: '', message: '' });
          }}
          className="btn btn-primary"
          style={{ padding: '8px 18px', fontSize: '14px' }}
        >
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #ef4444', color: '#991b1b', padding: '10px', borderRadius: '6px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#475569', marginBottom: '4px' }}>
          Full Name
        </label>
        <input
          type="text"
          required
          placeholder="e.g. Ama Serwaa"
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#475569', marginBottom: '4px' }}>
            Email Address
          </label>
          <input
            type="email"
            required
            placeholder="name@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#475569', marginBottom: '4px' }}>
            Phone / WhatsApp
          </label>
          <input
            type="tel"
            required
            placeholder="+233 24 000 0000"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
          />
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#475569', marginBottom: '4px' }}>
          Preferred Destination or Service
        </label>
        <input
          type="text"
          placeholder="e.g. Ghana December Tour, Dubai, Flights, Car Rental"
          value={formData.destination}
          onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
          style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#475569', marginBottom: '4px' }}>
          How Can We Help You?
        </label>
        <textarea
          rows={4}
          required
          placeholder="Tell us about your travel dates, group size, and any special requests..."
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', resize: 'vertical' }}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary"
        style={{ padding: '12px', fontSize: '15px', fontWeight: '700' }}
      >
        {loading ? 'Sending Message...' : 'Send Message'}
      </button>
    </form>
  );
}
