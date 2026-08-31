'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiPost } from '@/lib/api';

const POPULAR_DESTINATIONS = [
  'Ghana Cultural & Heritage',
  'Cape Coast & Elmina Castles',
  'Accra & Eastern Region Explorer',
  'Ashanti Kingdom & Kumasi',
  'Mole National Park Wildlife Safari',
  'Dubai Luxury Getaway',
  'Singapore & Malaysia Expedition',
  'Rwanda Gorilla Trekking',
  'Seychelles Tropical Retreat',
];

const TRAVEL_STYLES = [
  { id: 'cultural', label: 'Cultural & Heritage', icon: '🏛️' },
  { id: 'adventure', label: 'Wildlife Safari & Adventure', icon: '🦁' },
  { id: 'luxury', label: 'Luxury & Relaxation', icon: '✨' },
  { id: 'festival', label: 'Festivals & Events (Afrofuture / Chale Wote)', icon: '🎉' },
  { id: 'beach', label: 'Beach & Coastal Getaway', icon: '🏖️' },
  { id: 'business', label: 'Corporate / Educational Group', icon: '💼' },
];

const ACCOMMODATIONS = [
  { id: '5star', label: '5-Star Luxury Hotels & Resorts', desc: 'Top tier luxury suites and beachfront resorts' },
  { id: '4star', label: '4-Star Premium Boutique Stays', desc: 'High comfort and excellent amenities' },
  { id: 'ecolodge', label: 'Safari Eco-Lodges & Heritage Inns', desc: 'Serene authentic nature retreats' },
  { id: 'flexible', label: 'Best Value Handpicked', desc: 'Optimal comfort and budget balance' },
];

export default function PlanYourTripClient() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    // Step 1: Personal Details
    fullName: '',
    email: '',
    phone: '',
    countryOfResidence: 'Ghana',

    // Step 2: Travel Details
    destination: 'Ghana Cultural & Heritage',
    customDestination: '',
    startDate: '',
    endDate: '',
    flexibleDates: false,
    durationDays: '7',

    // Step 3: Travel Group & Style
    adults: '2',
    children: '0',
    infants: '0',
    travelStyle: 'Cultural & Heritage',
    accommodationTier: '4-Star Premium Boutique Stays',

    // Step 4: Budget & Special Requests
    estimatedBudget: '$1,500 - $3,000 per person',
    flightRequired: false,
    carRentalRequired: false,
    specialRequests: '',
  });

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      setStep((s) => s + 1);
      window.scrollTo({ top: 380, behavior: 'smooth' });
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => s - 1);
      window.scrollTo({ top: 380, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    const dest = formData.customDestination ? formData.customDestination : formData.destination;
    const paxSummary = `${formData.adults} Adults${Number(formData.children) > 0 ? `, ${formData.children} Children` : ''}${Number(formData.infants) > 0 ? `, ${formData.infants} Infants` : ''}`;

    const detailedMessage = `
--- CUSTOM TRIP REQUEST ---
Country of Residence: ${formData.countryOfResidence}
Estimated Duration: ${formData.durationDays} Days (Flexible: ${formData.flexibleDates ? 'Yes' : 'No'})
Travel Style: ${formData.travelStyle}
Accommodation Preference: ${formData.accommodationTier}
Estimated Budget: ${formData.estimatedBudget}
Flight Assistance: ${formData.flightRequired ? 'Yes, Flight Ticketing Needed' : 'No'}
Vehicle / Chauffeur Rental: ${formData.carRentalRequired ? 'Yes, Private Vehicle / Chauffeur Needed' : 'No'}
Special Requests: ${formData.specialRequests || 'None provided'}
    `.trim();

    try {
      await apiPost('/public/inquiries', {
        serviceType: 'CUSTOM_TRIP',
        destination: dest,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        guests: paxSummary,
        category: formData.travelStyle,
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        message: detailedMessage,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit trip request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', overflowX: 'hidden' }}>
      {/* 1. How It Works Section */}
      <section style={{ background: '#ffffff', padding: '60px 20px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '44px' }}>
            <span
              style={{
                display: 'inline-block',
                color: '#f37023',
                fontSize: '12px',
                fontWeight: '800',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                background: 'rgba(243, 112, 35, 0.1)',
                padding: '4px 14px',
                borderRadius: '9999px',
                marginBottom: '10px',
              }}
            >
              SIMPLE 3-STEP PROCESS
            </span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: '900', color: '#0f172a', margin: '0 0 10px', letterSpacing: '-0.5px' }}>
              How It Works
            </h2>
            <p style={{ fontSize: '15px', color: '#64748b', maxWidth: '600px', margin: '0 auto' }}>
              Tell us your dream holiday vision and let our experienced travel specialists craft your itinerary
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '30px' }}>
            {/* Step 1 */}
            <div style={{ textAlign: 'center', padding: '24px', background: '#f8fafc', borderRadius: '18px', border: '1px solid #e2e8f0' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#008744',
                  color: '#ffffff',
                  fontSize: '22px',
                  fontWeight: '900',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 18px',
                  boxShadow: '0 4px 12px rgba(0, 135, 68, 0.3)',
                }}
              >
                1
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>Share Your Travel Preferences</h3>
              <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: '1.55', margin: 0 }}>
                Tell us your travel dates, preferred destinations, group size, and favorite activities.
              </p>
            </div>

            {/* Step 2 */}
            <div style={{ textAlign: 'center', padding: '24px', background: '#f8fafc', borderRadius: '18px', border: '1px solid #e2e8f0' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#f37023',
                  color: '#ffffff',
                  fontSize: '22px',
                  fontWeight: '900',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 18px',
                  boxShadow: '0 4px 12px rgba(243, 112, 35, 0.3)',
                }}
              >
                2
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>Custom Itinerary &amp; Quote</h3>
              <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: '1.55', margin: 0 }}>
                Our destination experts design a tailored day-by-day plan with clear pricing and hotel options.
              </p>
            </div>

            {/* Step 3 */}
            <div style={{ textAlign: 'center', padding: '24px', background: '#f8fafc', borderRadius: '18px', border: '1px solid #e2e8f0' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#008744',
                  color: '#ffffff',
                  fontSize: '22px',
                  fontWeight: '900',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 18px',
                  boxShadow: '0 4px 12px rgba(0, 135, 68, 0.3)',
                }}
              >
                3
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>Book &amp; Travel Seamlessly</h3>
              <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: '1.55', margin: 0 }}>
                Confirm your bookings with official invoices, receipts, and 24/7 on-ground concierge support.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Emerald Green Form Section */}
      <section
        style={{
          background: 'radial-gradient(circle at 50% 0%, #004d26 0%, #002e17 100%)',
          padding: '80px 20px 110px',
          color: '#ffffff',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: '840px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <span
              style={{
                display: 'inline-block',
                color: '#f37023',
                fontSize: '12px',
                fontWeight: '800',
                letterSpacing: '1.5px',
                background: 'rgba(243, 112, 35, 0.15)',
                padding: '4px 16px',
                borderRadius: '9999px',
                border: '1px solid rgba(243, 112, 35, 0.3)',
                marginBottom: '10px',
              }}
            >
              YOUR TRIP DETAILS
            </span>
            <h2 style={{ fontSize: '2.5rem', fontWeight: '900', color: '#ffffff', margin: '0 0 10px', letterSpacing: '-0.5px' }}>
              Tell Us About Your Trip
            </h2>
            <p style={{ fontSize: '16px', color: '#e2e8f0', margin: 0, opacity: 0.95 }}>
              Fill in the details below and let&apos;s start planning your experience.
            </p>
          </div>

          {/* Form Wizard Card */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              width: '100%',
              boxSizing: 'border-box',
              padding: '36px 40px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
              color: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              overflow: 'hidden',
            }}
          >
            {!submitted ? (
              <>
                {/* Wizard Tab Navigation */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #f1f5f9',
                    paddingBottom: '18px',
                    marginBottom: '28px',
                    gap: '8px',
                    overflowX: 'auto',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                >
                  {[
                    { s: 1, label: 'Personal Details' },
                    { s: 2, label: 'Travel Details' },
                    { s: 3, label: 'Travel Group' },
                    { s: 4, label: 'Preferences' },
                  ].map((tab) => {
                    const isActive = step === tab.s;
                    const isDone = step > tab.s;
                    return (
                      <button
                        key={tab.s}
                        type="button"
                        onClick={() => isDone && setStep(tab.s)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: isActive ? '#f0fdf4' : 'transparent',
                          border: 'none',
                          cursor: isDone ? 'pointer' : 'default',
                          padding: '6px 12px',
                          borderRadius: '9999px',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <span
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            background: isActive || isDone ? '#008744' : '#f1f5f9',
                            color: isActive || isDone ? '#ffffff' : '#64748b',
                            fontSize: '12px',
                            fontWeight: '800',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {tab.s}
                        </span>
                        <span
                          style={{
                            fontSize: '13.5px',
                            fontWeight: isActive ? '800' : '700',
                            color: isActive ? '#008744' : isDone ? '#334155' : '#64748b',
                          }}
                        >
                          {tab.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {error && (
                  <div
                    style={{
                      background: '#fee2e2',
                      color: '#b91c1c',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      fontSize: '13.5px',
                      fontWeight: '700',
                      marginBottom: '20px',
                      border: '1px solid #fecaca',
                    }}
                  >
                    {error}
                  </div>
                )}

                <form onSubmit={handleNext} style={{ width: '100%', boxSizing: 'border-box' }}>
                  {/* STEP 1: Personal Details */}
                  {step === 1 && (
                    <div style={{ width: '100%', boxSizing: 'border-box' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          marginBottom: '24px',
                          padding: '14px 18px',
                          background: '#f0fdf4',
                          borderRadius: '14px',
                          border: '1px solid #dcfce7',
                          width: '100%',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '12px',
                            background: '#ffffff',
                            color: '#008744',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: '0 2px 6px rgba(0, 135, 68, 0.15)',
                          }}
                        >
                          👤
                        </div>
                        <div>
                          <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px' }}>
                            Personal Details
                          </h4>
                          <p style={{ fontSize: '12.5px', color: '#475569', margin: 0 }}>
                            How can we reach you with your itinerary?
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', width: '100%', boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                          <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b' }}>Full Name *</label>
                          <input
                            type="text"
                            required
                            placeholder="Your full name"
                            value={formData.fullName}
                            onChange={(e) => updateField('fullName', e.target.value)}
                            className="wizard-input"
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                          <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b' }}>Phone / WhatsApp Number *</label>
                          <input
                            type="tel"
                            required
                            placeholder="+233 XX XXX XXXX"
                            value={formData.phone}
                            onChange={(e) => updateField('phone', e.target.value)}
                            className="wizard-input"
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', width: '100%', boxSizing: 'border-box', marginTop: '18px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                          <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b' }}>Email Address *</label>
                          <input
                            type="email"
                            required
                            placeholder="your@email.com"
                            value={formData.email}
                            onChange={(e) => updateField('email', e.target.value)}
                            className="wizard-input"
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                          <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b' }}>Country of Residence</label>
                          <input
                            type="text"
                            placeholder="e.g. Ghana, USA, UK, Germany"
                            value={formData.countryOfResidence}
                            onChange={(e) => updateField('countryOfResidence', e.target.value)}
                            className="wizard-input"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Travel Details */}
                  {step === 2 && (
                    <div style={{ width: '100%', boxSizing: 'border-box' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          marginBottom: '24px',
                          padding: '14px 18px',
                          background: '#f0fdf4',
                          borderRadius: '14px',
                          border: '1px solid #dcfce7',
                          width: '100%',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '12px',
                            background: '#ffffff',
                            color: '#008744',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: '0 2px 6px rgba(0, 135, 68, 0.15)',
                          }}
                        >
                          🗺️
                        </div>
                        <div>
                          <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px' }}>
                            Travel Destination &amp; Timing
                          </h4>
                          <p style={{ fontSize: '12.5px', color: '#475569', margin: 0 }}>
                            Where would you like to go and when?
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '18px' }}>
                        <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b' }}>Select Destination</label>
                        <select
                          value={formData.destination}
                          onChange={(e) => updateField('destination', e.target.value)}
                          className="wizard-input"
                        >
                          {POPULAR_DESTINATIONS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                          <option value="Other / Multiple Destinations">Other / Multiple Destinations</option>
                        </select>
                      </div>

                      {formData.destination === 'Other / Multiple Destinations' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '18px' }}>
                          <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b' }}>Specify Custom Destination(s) *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Volta Region, Kumasi &amp; Cape Coast 10 Days"
                            value={formData.customDestination}
                            onChange={(e) => updateField('customDestination', e.target.value)}
                            className="wizard-input"
                          />
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', width: '100%', boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                          <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b' }}>Target Start Date</label>
                          <input
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => updateField('startDate', e.target.value)}
                            className="wizard-input"
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                          <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b' }}>Target End Date</label>
                          <input
                            type="date"
                            value={formData.endDate}
                            onChange={(e) => updateField('endDate', e.target.value)}
                            className="wizard-input"
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', width: '100%', boxSizing: 'border-box', marginTop: '18px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                          <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b' }}>Duration (Days)</label>
                          <input
                            type="number"
                            min="1"
                            max="60"
                            value={formData.durationDays}
                            onChange={(e) => updateField('durationDays', e.target.value)}
                            className="wizard-input"
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '28px' }}>
                          <input
                            type="checkbox"
                            id="flexibleDates"
                            checked={formData.flexibleDates}
                            onChange={(e) => updateField('flexibleDates', e.target.checked)}
                            style={{ width: '18px', height: '18px', accentColor: '#008744', cursor: 'pointer' }}
                          />
                          <label htmlFor="flexibleDates" style={{ fontSize: '13.5px', fontWeight: '600', color: '#475569', cursor: 'pointer' }}>
                            My dates are flexible (+/- a few days)
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Travel Group & Style */}
                  {step === 3 && (
                    <div style={{ width: '100%', boxSizing: 'border-box' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          marginBottom: '24px',
                          padding: '14px 18px',
                          background: '#f0fdf4',
                          borderRadius: '14px',
                          border: '1px solid #dcfce7',
                          width: '100%',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '12px',
                            background: '#ffffff',
                            color: '#008744',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: '0 2px 6px rgba(0, 135, 68, 0.15)',
                          }}
                        >
                          👥
                        </div>
                        <div>
                          <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px' }}>
                            Group Composition &amp; Style
                          </h4>
                          <p style={{ fontSize: '12.5px', color: '#475569', margin: 0 }}>
                            Who is traveling and what kind of trip do you envision?
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', width: '100%', boxSizing: 'border-box', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                          <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b' }}>Adults (18+) *</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            required
                            value={formData.adults}
                            onChange={(e) => updateField('adults', e.target.value)}
                            className="wizard-input"
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                          <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b' }}>Children (2-17)</label>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={formData.children}
                            onChange={(e) => updateField('children', e.target.value)}
                            className="wizard-input"
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                          <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b' }}>Infants (&lt;2)</label>
                          <input
                            type="number"
                            min="0"
                            max="20"
                            value={formData.infants}
                            onChange={(e) => updateField('infants', e.target.value)}
                            className="wizard-input"
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '18px' }}>
                        <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b' }}>Preferred Travel Style</label>
                        <select
                          value={formData.travelStyle}
                          onChange={(e) => updateField('travelStyle', e.target.value)}
                          className="wizard-input"
                        >
                          {TRAVEL_STYLES.map((t) => (
                            <option key={t.id} value={t.label}>
                              {t.icon} {t.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                        <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b' }}>Accommodation Level</label>
                        <select
                          value={formData.accommodationTier}
                          onChange={(e) => updateField('accommodationTier', e.target.value)}
                          className="wizard-input"
                        >
                          {ACCOMMODATIONS.map((a) => (
                            <option key={a.id} value={a.label}>
                              {a.label} — {a.desc}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: Preferences & Services */}
                  {step === 4 && (
                    <div style={{ width: '100%', boxSizing: 'border-box' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          marginBottom: '24px',
                          padding: '14px 18px',
                          background: '#f0fdf4',
                          borderRadius: '14px',
                          border: '1px solid #dcfce7',
                          width: '100%',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '12px',
                            background: '#ffffff',
                            color: '#008744',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: '0 2px 6px rgba(0, 135, 68, 0.15)',
                          }}
                        >
                          ✨
                        </div>
                        <div>
                          <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px' }}>
                            Budget &amp; Additional Services
                          </h4>
                          <p style={{ fontSize: '12.5px', color: '#475569', margin: 0 }}>
                            Add vehicle rentals, flights, or any special requests
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '18px' }}>
                        <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b' }}>Estimated Budget per Person</label>
                        <select
                          value={formData.estimatedBudget}
                          onChange={(e) => updateField('estimatedBudget', e.target.value)}
                          className="wizard-input"
                        >
                          <option value="Under $1,000 per person">Under $1,000 per person</option>
                          <option value="$1,000 - $2,000 per person">$1,000 - $2,000 per person</option>
                          <option value="$2,000 - $3,500 per person">$2,000 - $3,500 per person</option>
                          <option value="$3,500 - $5,000 per person">$3,500 - $5,000 per person</option>
                          <option value="$5,000+ Luxury / VIP per person">$5,000+ Luxury / VIP</option>
                        </select>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                        <div
                          onClick={() => updateField('flightRequired', !formData.flightRequired)}
                          style={{
                            padding: '16px',
                            borderRadius: '12px',
                            border: `1.5px solid ${formData.flightRequired ? '#008744' : '#e2e8f0'}`,
                            background: formData.flightRequired ? '#f0fdf4' : '#f8fafc',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={formData.flightRequired}
                            onChange={() => {}}
                            style={{ width: '18px', height: '18px', accentColor: '#008744' }}
                          />
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>✈️ Include Flight Booking</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>International or domestic flight ticketing</div>
                          </div>
                        </div>

                        <div
                          onClick={() => updateField('carRentalRequired', !formData.carRentalRequired)}
                          style={{
                            padding: '16px',
                            borderRadius: '12px',
                            border: `1.5px solid ${formData.carRentalRequired ? '#008744' : '#e2e8f0'}`,
                            background: formData.carRentalRequired ? '#f0fdf4' : '#f8fafc',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={formData.carRentalRequired}
                            onChange={() => {}}
                            style={{ width: '18px', height: '18px', accentColor: '#008744' }}
                          />
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>🚗 Include Vehicle / Chauffeur</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>Dedicated 4x4 Prado, bus, or saloon car</div>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                        <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b' }}>
                          Special Notes, Dietary Preferences or Specific Sites to Visit
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Tell us any specific attractions (e.g. Kakum canopy walk, Cape Coast castle, drumming workshop, wedding anniversary surprise)..."
                          value={formData.specialRequests}
                          onChange={(e) => updateField('specialRequests', e.target.value)}
                          className="wizard-textarea"
                        />
                      </div>
                    </div>
                  )}

                  {/* Wizard Footer Controls */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '36px',
                      paddingTop: '22px',
                      borderTop: '1px solid #f1f5f9',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  >
                    {step > 1 ? (
                      <button
                        type="button"
                        onClick={handleBack}
                        style={{
                          background: '#f1f5f9',
                          color: '#475569',
                          border: '1px solid #e2e8f0',
                          fontSize: '14px',
                          fontWeight: '700',
                          padding: '11px 22px',
                          borderRadius: '9999px',
                          cursor: 'pointer',
                        }}
                      >
                        ← Back
                      </button>
                    ) : (
                      <div />
                    )}

                    {/* Step indicator dots */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {[1, 2, 3, 4].map((dot) => (
                        <div
                          key={dot}
                          style={{
                            width: step === dot ? '24px' : '8px',
                            height: '8px',
                            borderRadius: '9999px',
                            background: step === dot ? '#f37023' : step > dot ? '#008744' : '#e2e8f0',
                            transition: 'all 0.2s ease',
                          }}
                        />
                      ))}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        background: 'linear-gradient(135deg, #008744 0%, #006837 100%)',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '14px',
                        fontWeight: '800',
                        padding: '13px 30px',
                        borderRadius: '9999px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(0, 135, 68, 0.35)',
                      }}
                    >
                      {loading ? 'Submitting…' : step === 4 ? 'Request Custom Itinerary →' : 'Next Step →'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              /* Success State */
              <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                <div style={{ fontSize: '54px', marginBottom: '16px' }}>🎉</div>
                <h3 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', margin: '0 0 12px' }}>
                  Custom Trip Request Received!
                </h3>
                <p style={{ fontSize: '15px', color: '#64748b', maxWidth: '580px', margin: '0 auto 24px', lineHeight: '1.6' }}>
                  Thank you, <strong>{formData.fullName}</strong>. Our custom travel specialists are reviewing your request for <strong>{formData.destination}</strong>. We will design a customized day-by-day itinerary with exact quotes and get in touch with you shortly.
                </p>

                <div
                  style={{
                    background: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    padding: '18px 24px',
                    textAlign: 'left',
                    maxWidth: '500px',
                    margin: '0 auto 28px',
                    fontSize: '13.5px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div><strong>Destination:</strong> {formData.customDestination || formData.destination}</div>
                  <div><strong>Travelers:</strong> {formData.adults} Adults, {formData.children} Children</div>
                  <div><strong>Style:</strong> {formData.travelStyle} ({formData.accommodationTier})</div>
                  <div><strong>Contact:</strong> {formData.email} | {formData.phone}</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <a
                    href={`https://wa.me/233244311267?text=${encodeURIComponent(`Hello Sunseekers Tours! I just submitted a custom trip plan request for ${formData.destination}.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-green"
                  >
                    💬 Chat on WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setStep(1);
                    }}
                    className="btn btn-primary"
                  >
                    Plan Another Trip
                  </button>
                  <Link href="/tours" className="btn btn-primary" style={{ background: '#0f172a' }}>
                    Browse All Tours
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
