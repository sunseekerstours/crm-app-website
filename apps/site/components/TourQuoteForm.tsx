'use client';

import { useState } from 'react';
import { apiPost } from '@/lib/api';

export default function TourQuoteForm({ tourName }: { tourName: string }) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiPost('/public/inquiries', {
        serviceType: 'TOUR',
        interestedTour: tourName,
        destination: tourName,
        fullName: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        phone: formData.phone,
        message: formData.message,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit quote request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="quote-form-card" style={{ background: '#f8fafc', padding: '32px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '8px' }}>✅</div>
        <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--brand)', margin: '0 0 6px' }}>
          Quote Request Received!
        </h3>
        <p style={{ color: '#475569', fontSize: '14px', margin: '0 0 16px', lineHeight: 1.5 }}>
          Thank you, <strong>{formData.firstName}</strong>. Our tour specialist for <strong>{tourName}</strong> will email/call you with itinerary pricing.
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setFormData({ firstName: '', lastName: '', email: '', phone: '', message: '' });
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
    <div className="quote-form-card" style={{ background: '#f8fafc', padding: '28px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '32px' }}>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px' }}>
          Request Free Quote
        </h3>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
          Fill out the form below to receive a personalized quote for this tour.
        </p>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #ef4444', color: '#991b1b', padding: '10px', borderRadius: '6px', marginBottom: '14px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <input
            type="text"
            required
            placeholder="First Name"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
          />
          <input
            type="text"
            required
            placeholder="Last Name"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
          />
        </div>

        <input
          type="email"
          required
          placeholder="Email Address"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
        />

        <input
          type="tel"
          required
          placeholder="Phone Number / WhatsApp"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
        />

        <textarea
          rows={3}
          placeholder="Your Message (Optional travel dates, number of travelers, etc.)"
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', resize: 'vertical' }}
        />

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
          style={{ width: '100%', padding: '10px', fontSize: '15px', fontWeight: '700', marginTop: '4px' }}
        >
          {loading ? 'Submitting...' : 'Get Quote'}
        </button>
      </form>
    </div>
  );
}
