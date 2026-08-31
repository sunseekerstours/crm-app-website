'use client';

import { useState } from 'react';
import PageHeroSlider from './PageHeroSlider';
import { apiPost } from '@/lib/api';

const HERO_SLIDES = [
  'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=1920&auto=format&fit=crop',
];

export interface FleetVehicle {
  id: string;
  name: string;
  category: string;
  seats: string;
  luggage: string;
  features: string[];
  image: string;
}

const FLEET_VEHICLES: FleetVehicle[] = [
  {
    id: 'saloon-car',
    name: 'Saloon Car',
    category: 'Executive Saloon (Toyota Camry / Mercedes)',
    seats: '4 Passengers',
    luggage: '2-3 Large Bags',
    features: ['Full Air-Conditioning', 'Chauffeur Driven', 'City & Inter-city'],
    image: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'comfortable-coach',
    name: 'Comfortable Coach',
    category: '45+ Seater Luxury Tourist Coach',
    seats: '35–50 Passengers',
    luggage: 'Ample Luggage Bay',
    features: ['Luxury Reclining Seats', 'PA Sound System', 'Tour / Corporate Groups'],
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'mini-van',
    name: 'Mini Van',
    category: '15-Seater Toyota HiAce Mini-Bus',
    seats: '12–15 Passengers',
    luggage: '6-8 Large Bags',
    features: ['High-Roof Comfort', 'Tinted Windows', 'Family & Small Tours'],
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'suvs',
    name: 'SUVs (Toyota Prado 4x4)',
    category: '4x4 Toyota Land Cruiser / Prado',
    seats: '7 Passengers',
    luggage: '4-5 Large Bags',
    features: ['4WD All-Terrain', 'Leather Interior', 'Safari Expeditions & VIP'],
    image: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'mid-sized-bus',
    name: 'Mid-Sized Bus',
    category: '30-Seater Coaster Tour Bus',
    seats: '25–30 Passengers',
    luggage: 'Medium Luggage Space',
    features: ['High-Back Seats', 'Climate Control', 'Excursions & Conferences'],
    image: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?q=80&w=800&auto=format&fit=crop',
  },
];

export default function CarRentalsClient() {
  const [selectedVehicle, setSelectedVehicle] = useState(FLEET_VEHICLES[0].category);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    pickupLocation: 'Accra (Airport / Hotel)',
    dropoffLocation: 'Accra',
    startDate: '',
    endDate: '',
    serviceOption: 'With Professional Driver',
    fullName: '',
    email: '',
    phone: '',
    message: '',
  });

  const handleSelectVehicle = (cat: string) => {
    setSelectedVehicle(cat);
    const formEl = document.getElementById('vehicle-booking-section');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiPost('/public/inquiries', {
        serviceType: 'VEHICLE',
        destination: `Vehicle: ${selectedVehicle} in ${formData.pickupLocation}`,
        category: selectedVehicle,
        pickupLocation: formData.pickupLocation,
        dropoffLocation: formData.dropoffLocation,
        startDate: formData.startDate,
        endDate: formData.endDate,
        guests: formData.serviceOption,
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

  return (
    <>
      {/* 1. 4-Slide Auto-Transitioning Hero Banner */}
      <PageHeroSlider
        slides={HERO_SLIDES}
        defaultEyebrow="TRAVEL IN COMFORT &amp; STYLE"
        defaultTitle="Vehicle Rentals &amp; Logistics"
        defaultSubtitle="Choose from our fleet of well-maintained chauffeur-driven &amp; self-drive vehicles across Ghana"
        height="400px"
      />

      {/* 2. Book A Vehicle Fleet Grid (Screenshots 1 & 2) */}
      <section className="section" style={{ background: '#ffffff', padding: '64px 0 48px' }}>
        <div className="container">
          <div className="section-head-center">
            <div className="section-eyebrow">OUR FLEET</div>
            <h2 className="section-title">Book A Vehicle</h2>
            <p className="section-subtitle">
              Select your desired vehicle category below to get an instant tailored quote
            </p>
          </div>

          <div className="vehicle-fleet-grid">
            {FLEET_VEHICLES.map((v) => (
              <div
                key={v.id}
                className={`vehicle-card ${selectedVehicle === v.category ? 'selected' : ''}`}
              >
                <div className="vehicle-img-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.image}
                    alt={v.name}
                    loading="lazy"
                  />
                  <div className="vehicle-seat-badge">👥 {v.seats}</div>
                </div>

                <div className="vehicle-banner-header">
                  <h3 className="vehicle-name">{v.name}</h3>
                </div>

                <div className="vehicle-body-content">
                  <div className="vehicle-specs-list">
                    <div className="spec-item">
                      <span>🧳 {v.luggage}</span>
                    </div>
                    {v.features.map((feat, idx) => (
                      <div key={idx} className="spec-item">
                        <span>✓ {feat}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectVehicle(v.category)}
                    className="btn-book-vehicle"
                  >
                    {selectedVehicle === v.category ? '✓ Selected' : 'Book Now'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Vehicle Booking Form Section */}
      <section id="vehicle-booking-section" className="section" style={{ background: '#f8fafc', padding: '60px 0 80px' }}>
        <div className="container" style={{ maxWidth: '860px' }}>
          <div className="form-card-container">
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <span className="destinations-eyebrow" style={{ marginBottom: '8px' }}>
                RESERVATION FORM
              </span>
              <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', margin: '0 0 6px' }}>
                Reserve: {selectedVehicle}
              </h2>
              <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                Fill in your travel dates and pickup details for instant booking confirmation
              </p>
            </div>

            {error && (
              <div className="wizard-error-banner">
                {error}
              </div>
            )}

            {submitted ? (
              <div className="wizard-success-state">
                <div className="success-icon-badge">🚗</div>
                <h3 className="success-title">Vehicle Reservation Received!</h3>
                <p className="success-sub">
                  Thank you, <strong>{formData.fullName}</strong>. Our fleet operations manager has reserved your inquiry for <strong>{selectedVehicle}</strong>. We will contact you via WhatsApp/phone to confirm.
                </p>
                <div className="success-actions">
                  <a
                    href={`https://wa.me/233244311267?text=${encodeURIComponent(`Hello Sunseekers Tours! I want to confirm my booking for ${selectedVehicle}.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-green"
                  >
                    💬 Chat on WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="btn btn-primary"
                  >
                    Book Another Vehicle
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="wizard-fields-grid-2" style={{ marginBottom: '18px' }}>
                  <div className="field-group">
                    <label className="field-label">Vehicle Selected</label>
                    <select
                      value={selectedVehicle}
                      onChange={(e) => setSelectedVehicle(e.target.value)}
                      className="wizard-input"
                    >
                      {FLEET_VEHICLES.map((v) => (
                        <option key={v.id} value={v.category}>
                          {v.name} ({v.seats})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field-group">
                    <label className="field-label">Service Option</label>
                    <select
                      value={formData.serviceOption}
                      onChange={(e) => setFormData({ ...formData, serviceOption: e.target.value })}
                      className="wizard-input"
                    >
                      <option value="With Professional Driver">With Professional Chauffeur</option>
                      <option value="Airport Transfer Only">Airport Transfer Only</option>
                      <option value="Inter-City Travel across Ghana">Inter-City Travel across Ghana</option>
                      <option value="Self-Drive (Subject to verification)">Self-Drive</option>
                    </select>
                  </div>
                </div>

                <div className="wizard-fields-grid-2" style={{ marginBottom: '18px' }}>
                  <div className="field-group">
                    <label className="field-label">Pick-up Location *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kotoka Int'l Airport / Kempinski Hotel"
                      value={formData.pickupLocation}
                      onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })}
                      className="wizard-input"
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">Drop-off Location *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Accra, Cape Coast, Kumasi"
                      value={formData.dropoffLocation}
                      onChange={(e) => setFormData({ ...formData, dropoffLocation: e.target.value })}
                      className="wizard-input"
                    />
                  </div>
                </div>

                <div className="wizard-fields-grid-2" style={{ marginBottom: '18px' }}>
                  <div className="field-group">
                    <label className="field-label">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="wizard-input"
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">End Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="wizard-input"
                    />
                  </div>
                </div>

                <div className="wizard-fields-grid-3" style={{ marginBottom: '22px' }}>
                  <div className="field-group">
                    <label className="field-label">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Your full name"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="wizard-input"
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="wizard-input"
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">Phone / WhatsApp *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+233 XX XXX XXXX"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="wizard-input"
                    />
                  </div>
                </div>

                <div className="field-group" style={{ marginBottom: '24px' }}>
                  <label className="field-label">Additional Instructions / Requests</label>
                  <textarea
                    rows={2}
                    placeholder="Specific vehicle preferences, flight numbers for airport pickup, etc."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="wizard-textarea"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-wizard-next"
                  style={{ width: '100%', padding: '14px', fontSize: '16px' }}
                >
                  {loading ? 'Submitting Reservation…' : 'Confirm Vehicle Reservation →'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
