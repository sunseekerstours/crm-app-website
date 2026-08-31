'use client';

import { useState } from 'react';
import { apiPost } from '@/lib/api';

export default function VehicleBookingForm() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    category: '4x4 Toyota Land Cruiser / Prado',
    pickupLocation: 'Accra (Airport / Hotel)',
    dropoffLocation: 'Accra',
    startDate: '',
    endDate: '',
    guests: 'With Professional Driver',
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
        serviceType: 'VEHICLE',
        destination: `Vehicle: ${formData.category} in ${formData.pickupLocation}`,
        category: formData.category,
        pickupLocation: formData.pickupLocation,
        dropoffLocation: formData.dropoffLocation,
        startDate: formData.startDate,
        endDate: formData.endDate,
        guests: formData.guests,
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        message: formData.message,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit rental request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="form-card-container">
        <div style={{ textAlign: 'center', padding: '32px 16px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🚗</div>
          <h3 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--brand)', margin: '0 0 8px' }}>
            Vehicle Reservation Received!
          </h3>
          <p style={{ color: '#475569', maxWidth: '440px', margin: '0 auto 24px', lineHeight: 1.6 }}>
            Thank you, <strong>{formData.fullName}</strong>. Our fleet operations manager has reserved your inquiry for <strong>{formData.category}</strong> and will contact you with booking confirmation.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setFormData({
                category: '4x4 Toyota Land Cruiser / Prado',
                pickupLocation: 'Accra (Airport / Hotel)',
                dropoffLocation: 'Accra',
                startDate: '',
                endDate: '',
                guests: 'With Professional Driver',
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
          Request Vehicle Rental
        </h2>
        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
          Chauffeur-driven 4x4 SUVs, executive saloons, and modern tour coaches across Ghana
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
              Vehicle Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff', outline: 'none' }}
            >
              <option value="4x4 Toyota Land Cruiser / Prado">4x4 Toyota Land Cruiser / Prado</option>
              <option value="Executive Saloon (Toyota Camry / Mercedes)">Executive Saloon (Camry / Mercedes)</option>
              <option value="15-Seater Toyota HiAce Mini-Bus">15-Seater Mini-Bus (Toyota HiAce)</option>
              <option value="30-Seater Coaster Tour Bus">30-Seater Coaster Tour Bus</option>
              <option value="45+ Seater Luxury Tourist Coach">45+ Seater Luxury Coach</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#475569', marginBottom: '6px' }}>
              Service Option
            </label>
            <select
              value={formData.guests}
              onChange={(e) => setFormData({ ...formData, guests: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff', outline: 'none' }}
            >
              <option value="With Professional Driver">With Professional Chauffeur / Driver</option>
              <option value="Airport Transfer Only">Airport Transfer Only</option>
              <option value="Inter-City Travel across Ghana">Inter-City Travel across Ghana</option>
              <option value="Self-Drive (Subject to verification)">Self-Drive</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#475569', marginBottom: '6px' }}>
              Pick-up Location
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Kotoka Int'l Airport / Kempinski Hotel"
              value={formData.pickupLocation}
              onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#475569', marginBottom: '6px' }}>
              Drop-off Location
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Accra, Cape Coast, Kumasi"
              value={formData.dropoffLocation}
              onChange={(e) => setFormData({ ...formData, dropoffLocation: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#475569', marginBottom: '6px' }}>
              Pick-up Date
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
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#475569', marginBottom: '6px' }}>
              Full Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Kojo Asante"
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
          {loading ? 'Submitting Request...' : 'Confirm Vehicle Rental Request'}
        </button>
      </form>
    </div>
  );
}
