'use client';

import { useState } from 'react';
import { apiPost } from '@/lib/api';

export default function FlightBookingForm() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    tripType: 'Round Trip',
    pickupLocation: 'Accra (ACC)',
    dropoffLocation: '',
    startDate: '',
    endDate: '',
    category: 'Economy',
    guests: '1 Passenger',
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
        serviceType: 'FLIGHT',
        destination: `${formData.pickupLocation} to ${formData.dropoffLocation}`,
        pickupLocation: formData.pickupLocation,
        dropoffLocation: formData.dropoffLocation,
        startDate: formData.startDate,
        endDate: formData.endDate,
        category: `${formData.tripType} - ${formData.category}`,
        guests: formData.guests,
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        message: formData.message,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit flight inquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="form-card-container">
        <div style={{ textAlign: 'center', padding: '32px 16px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>✈️</div>
          <h3 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--brand)', margin: '0 0 8px' }}>
            Flight Inquiry Received!
          </h3>
          <p style={{ color: '#475569', maxWidth: '440px', margin: '0 auto 24px', lineHeight: 1.6 }}>
            Thank you, <strong>{formData.fullName}</strong>. Our ticketing team is searching for the best fares from <strong>{formData.pickupLocation}</strong> to <strong>{formData.dropoffLocation}</strong> and will email/call you shortly.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setFormData({
                tripType: 'Round Trip',
                pickupLocation: 'Accra (ACC)',
                dropoffLocation: '',
                startDate: '',
                endDate: '',
                category: 'Economy',
                guests: '1 Passenger',
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
          Request Flight Booking
        </h2>
        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
          Find competitive fares with leading domestic and international airlines
        </p>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #ef4444', color: '#991b1b', padding: '12px', borderRadius: '8px', marginBottom: '18px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          {['Round Trip', 'One Way', 'Multi-City'].map((type) => (
            <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '600', color: formData.tripType === type ? 'var(--brand)' : '#64748b', cursor: 'pointer' }}>
              <input
                type="radio"
                name="tripType"
                value={type}
                checked={formData.tripType === type}
                onChange={(e) => setFormData({ ...formData, tripType: e.target.value })}
              />
              {type}
            </label>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#475569', marginBottom: '6px' }}>
              From (Departure City)
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Accra (ACC), London (LHR)"
              value={formData.pickupLocation}
              onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#475569', marginBottom: '6px' }}>
              To (Destination City)
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Dubai (DXB), Singapore (SIN)"
              value={formData.dropoffLocation}
              onChange={(e) => setFormData({ ...formData, dropoffLocation: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#475569', marginBottom: '6px' }}>
              Departure Date
            </label>
            <input
              type="date"
              required
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
            />
          </div>

          {formData.tripType === 'Round Trip' && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#475569', marginBottom: '6px' }}>
                Return Date
              </label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#475569', marginBottom: '6px' }}>
              Cabin Class
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff', outline: 'none' }}
            >
              <option value="Economy">Economy</option>
              <option value="Premium Economy">Premium Economy</option>
              <option value="Business Class">Business Class</option>
              <option value="First Class">First Class</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#475569', marginBottom: '6px' }}>
              Full Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Abena Darko"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
            />
          </div>

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
              Phone Number
            </label>
            <input
              type="tel"
              required
              placeholder="+233 20 000 0000"
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
          {loading ? 'Searching Fares...' : 'Request Flight Itinerary & Quote'}
        </button>
      </form>
    </div>
  );
}
