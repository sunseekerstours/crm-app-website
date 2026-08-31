'use client';

import { useState } from 'react';
import { apiPost } from '@/lib/api';

export default function HotelBookingForm() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    destination: '',
    startDate: '',
    endDate: '',
    category: 'Deluxe Room',
    guests: '2 Guests',
    fullName: '',
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
        serviceType: 'HOTEL',
        destination: formData.destination,
        startDate: formData.startDate,
        endDate: formData.endDate,
        category: formData.category,
        guests: formData.guests,
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        message: formData.message,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit booking request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="form-card-container">
        <div style={{ textAlign: 'center', padding: '32px 16px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
          <h3 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--brand)', margin: '0 0 8px' }}>
            Hotel Request Received!
          </h3>
          <p style={{ color: '#475569', maxWidth: '440px', margin: '0 auto 24px', lineHeight: 1.6 }}>
            Thank you, <strong>{formData.fullName}</strong>. Our reservation concierge has received your request for <strong>{formData.destination || 'your stay'}</strong> and will contact you with curated options shortly.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setFormData({
                destination: '',
                startDate: '',
                endDate: '',
                category: 'Deluxe Room',
                guests: '2 Guests',
                fullName: '',
                email: '',
                phone: '',
                message: '',
              });
            }}
            className="btn btn-primary"
            style={{ padding: '10px 24px', fontSize: '15px' }}
          >
            Submit Another Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-card-container">
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>
          Request Hotel Booking
        </h2>
        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
          Tell us your preferences and our travel experts will find the perfect hotel for you
        </p>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #ef4444', color: '#991b1b', padding: '12px', borderRadius: '8px', marginBottom: '18px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#475569', marginBottom: '6px' }}>
              Destination / City
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Accra, Dubai, Singapore"
              value={formData.destination}
              onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#475569', marginBottom: '6px' }}>
              Check-in Date
            </label>
            <input
              type="date"
              required
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#475569', marginBottom: '6px' }}>
              Check-out Date
            </label>
            <input
              type="date"
              required
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#475569', marginBottom: '6px' }}>
              Room Type
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff', outline: 'none' }}
            >
              <option value="Standard Room">Standard Room</option>
              <option value="Deluxe Room">Deluxe Room</option>
              <option value="Executive Suite">Executive Suite</option>
              <option value="Family Suite / Villa">Family Suite / Villa</option>
              <option value="Luxury 5-Star Resort">Luxury 5-Star Resort</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#475569', marginBottom: '6px' }}>
              Number of Guests
            </label>
            <select
              value={formData.guests}
              onChange={(e) => setFormData({ ...formData, guests: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff', outline: 'none' }}
            >
              <option value="1 Adult">1 Adult</option>
              <option value="2 Adults">2 Adults</option>
              <option value="2 Adults + 1 Child">2 Adults + 1 Child</option>
              <option value="Family (3-4 Guests)">Family (3-4 Guests)</option>
              <option value="Group (5+ Guests)">Group (5+ Guests)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#475569', marginBottom: '6px' }}>
              Full Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Kwame Mensah"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#475569', marginBottom: '6px' }}>
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="name@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#475569', marginBottom: '6px' }}>
              Phone / WhatsApp
            </label>
            <input
              type="tel"
              required
              placeholder="+233 24 000 0000"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
          style={{ width: '100%', padding: '12px', fontSize: '16px', fontWeight: '700' }}
        >
          {loading ? 'Submitting Request...' : 'Submit Hotel Booking Request'}
        </button>
      </form>
    </div>
  );
}
