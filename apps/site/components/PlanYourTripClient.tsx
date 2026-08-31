'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiPost } from '@/lib/api';

export default function PlanYourTripClient() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Personal Details
    fullName: '',
    phone: '',
    email: '',
    // Step 2: Travel Details
    destination: 'Ghana Heritage & Culture',
    travelDate: '',
    durationDays: '7',
    departureCity: 'Accra, Ghana',
    // Step 3: Travel Group
    adults: '2',
    children: '0',
    infants: '0',
    tripType: 'Vacation / Leisure',
    // Step 4: Preferences
    accommodation: '4-Star Premium Hotel',
    budgetPerPerson: '$1,000 - $2,500',
    specialRequests: '',
  });

  const updateField = (field: string, val: string) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!formData.fullName || !formData.phone || !formData.email) {
        setError('Please fill in all contact fields.');
        return;
      }
    }
    setError(null);
    if (step < 4) {
      setStep((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    setError(null);
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const notes = `
=== CUSTOM TRIP PLANNING REQUEST ===
Destination: ${formData.destination}
Estimated Date: ${formData.travelDate}
Duration: ${formData.durationDays} Days
Departure City: ${formData.departureCity}
Travel Group: ${formData.adults} Adults, ${formData.children} Children, ${formData.infants} Infants
Trip Type: ${formData.tripType}
Accommodation: ${formData.accommodation}
Budget/Person: ${formData.budgetPerPerson}
Special Requests: ${formData.specialRequests || 'None'}
      `.trim();

      const [firstName, ...rest] = formData.fullName.trim().split(' ');
      const lastName = rest.join(' ') || 'Traveler';

      await apiPost('/public/leads', {
        firstName,
        lastName,
        email: formData.email,
        phone: formData.phone,
        source: 'WEBSITE_PLAN_YOUR_TRIP',
        notes,
        preferredDestination: formData.destination,
      });

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="plan-trip-page-wrapper">
      {/* 1. How It Works Section (Screenshot 1 - Clean White) */}
      <section className="how-it-works-section">
        <div className="container">
          <h2 className="how-it-works-title">How It Works</h2>

          <div className="how-it-works-steps">
            {/* Step 1 */}
            <div className="how-step-item">
              <div className="how-step-number-circle">01</div>
              <h3 className="how-step-heading">Tell Us Your Travel Plans</h3>
              <p className="how-step-desc">
                Fill out the form below with your destination, dates, group size, and preferences.
              </p>
            </div>

            <div className="how-step-connector" />

            {/* Step 2 */}
            <div className="how-step-item">
              <div className="how-step-number-circle">02</div>
              <h3 className="how-step-heading">We Design Your Itinerary</h3>
              <p className="how-step-desc">
                Our travel experts craft a personalized itinerary based on your needs and budget.
              </p>
            </div>

            <div className="how-step-connector" />

            {/* Step 3 */}
            <div className="how-step-item">
              <div className="how-step-number-circle">03</div>
              <h3 className="how-step-heading">You Review &amp; Confirm</h3>
              <p className="how-step-desc">
                We guide you to choose the best option and secure your booking &mdash; stress-free.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Dark Green Form Section (Screenshot 1 - #1e3a2f background) */}
      <section className="plan-form-green-section">
        <div className="container">
          <div className="plan-form-header">
            <span className="plan-form-eyebrow">YOUR TRIP DETAILS</span>
            <h2 className="plan-form-title">Tell Us About Your Trip</h2>
            <p className="plan-form-sub">
              Fill in the details below and let&apos;s start planning your experience.
            </p>
          </div>

          {/* Form Wizard Card */}
          <div className="plan-wizard-card">
            {!submitted ? (
              <>
                {/* Wizard Tab Navigation */}
                <div className="wizard-tabs-bar">
                  <button
                    type="button"
                    className={`wizard-tab-btn ${step === 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}
                    onClick={() => step > 1 && setStep(1)}
                  >
                    <span className="tab-num">1</span>
                    <span className="tab-label">Personal Details</span>
                  </button>

                  <button
                    type="button"
                    className={`wizard-tab-btn ${step === 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}
                    onClick={() => step > 2 && setStep(2)}
                  >
                    <span className="tab-num">2</span>
                    <span className="tab-label">Travel Details</span>
                  </button>

                  <button
                    type="button"
                    className={`wizard-tab-btn ${step === 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}
                    onClick={() => step > 3 && setStep(3)}
                  >
                    <span className="tab-num">3</span>
                    <span className="tab-label">Travel Group</span>
                  </button>

                  <button
                    type="button"
                    className={`wizard-tab-btn ${step === 4 ? 'active' : ''}`}
                    onClick={() => step > 3 && setStep(4)}
                  >
                    <span className="tab-num">4</span>
                    <span className="tab-label">Preferences</span>
                  </button>
                </div>

                {error && <div className="wizard-error-banner">{error}</div>}

                <form onSubmit={handleNext} className="wizard-form-body">
                  {/* STEP 1: Personal Details */}
                  {step === 1 && (
                    <div className="wizard-step-content">
                      <div className="step-intro-header">
                        <div className="step-intro-icon">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="step-intro-title">Personal Details</h4>
                          <p className="step-intro-sub">How can we reach you with your itinerary?</p>
                        </div>
                      </div>

                      <div className="wizard-fields-grid-2">
                        <div className="field-group">
                          <label className="field-label">Full Name *</label>
                          <input
                            type="text"
                            required
                            placeholder="Your full name"
                            value={formData.fullName}
                            onChange={(e) => updateField('fullName', e.target.value)}
                            className="wizard-input"
                          />
                        </div>

                        <div className="field-group">
                          <label className="field-label">Phone Number (WhatsApp preferred) *</label>
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

                      <div className="field-group" style={{ marginTop: '16px' }}>
                        <label className="field-label">Email Address *</label>
                        <input
                          type="email"
                          required
                          placeholder="your@email.com"
                          value={formData.email}
                          onChange={(e) => updateField('email', e.target.value)}
                          className="wizard-input"
                        />
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Travel Details */}
                  {step === 2 && (
                    <div className="wizard-step-content">
                      <div className="step-intro-header">
                        <div className="step-intro-icon">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="step-intro-title">Travel Details</h4>
                          <p className="step-intro-sub">Where would you like to travel and when?</p>
                        </div>
                      </div>

                      <div className="wizard-fields-grid-2">
                        <div className="field-group">
                          <label className="field-label">Destination of Interest *</label>
                          <select
                            value={formData.destination}
                            onChange={(e) => updateField('destination', e.target.value)}
                            className="wizard-input"
                          >
                            <option value="Ghana Heritage, Castles & Festivals">🇬🇭 Ghana Heritage, Castles &amp; Festivals</option>
                            <option value="December in Ghana Festival Extravaganza">🇬🇭 December in Ghana Festival Extravaganza</option>
                            <option value="Dubai Luxury & Desert Safari">🇦🇪 Dubai Luxury &amp; Desert Safari</option>
                            <option value="Singapore & Malaysia Wonder">🇸🇬 Singapore &amp; Malaysia Wonder</option>
                            <option value="Rwanda Land of 1,000 Hills & Gorillas">🇷🇼 Rwanda Land of 1,000 Hills &amp; Gorillas</option>
                            <option value="Seychelles Tropical Getaway">🇸🇨 Seychelles Tropical Getaway</option>
                            <option value="Kenya / Tanzania Wildlife Safari">🇰🇪 Kenya / Tanzania Wildlife Safari</option>
                            <option value="South Africa Cape Town & Garden Route">🇿🇦 South Africa Cape Town &amp; Garden Route</option>
                            <option value="Custom Bespoke Multi-Country Trip">🌍 Custom Multi-Country Trip</option>
                          </select>
                        </div>

                        <div className="field-group">
                          <label className="field-label">Estimated Travel Date / Month *</label>
                          <input
                            type="date"
                            required
                            value={formData.travelDate}
                            onChange={(e) => updateField('travelDate', e.target.value)}
                            className="wizard-input"
                          />
                        </div>
                      </div>

                      <div className="wizard-fields-grid-2" style={{ marginTop: '16px' }}>
                        <div className="field-group">
                          <label className="field-label">Trip Duration (Days)</label>
                          <input
                            type="number"
                            min="1"
                            max="60"
                            value={formData.durationDays}
                            onChange={(e) => updateField('durationDays', e.target.value)}
                            className="wizard-input"
                          />
                        </div>

                        <div className="field-group">
                          <label className="field-label">Departure City / Country</label>
                          <input
                            type="text"
                            placeholder="e.g. Accra, London, New York, Lagos"
                            value={formData.departureCity}
                            onChange={(e) => updateField('departureCity', e.target.value)}
                            className="wizard-input"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Travel Group */}
                  {step === 3 && (
                    <div className="wizard-step-content">
                      <div className="step-intro-header">
                        <div className="step-intro-icon">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.104.75.75 0 00.425-.67v-.002a5.625 5.625 0 00-9.428-4.103 7.877 7.877 0 014.177 4.775z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="step-intro-title">Travel Group</h4>
                          <p className="step-intro-sub">Who is coming along on this journey?</p>
                        </div>
                      </div>

                      <div className="wizard-fields-grid-3">
                        <div className="field-group">
                          <label className="field-label">Adults (12+ yrs)</label>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={formData.adults}
                            onChange={(e) => updateField('adults', e.target.value)}
                            className="wizard-input"
                          />
                        </div>

                        <div className="field-group">
                          <label className="field-label">Children (2-11 yrs)</label>
                          <input
                            type="number"
                            min="0"
                            max="20"
                            value={formData.children}
                            onChange={(e) => updateField('children', e.target.value)}
                            className="wizard-input"
                          />
                        </div>

                        <div className="field-group">
                          <label className="field-label">Infants (&lt; 2 yrs)</label>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={formData.infants}
                            onChange={(e) => updateField('infants', e.target.value)}
                            className="wizard-input"
                          />
                        </div>
                      </div>

                      <div className="field-group" style={{ marginTop: '16px' }}>
                        <label className="field-label">Trip Occasion / Purpose</label>
                        <select
                          value={formData.tripType}
                          onChange={(e) => updateField('tripType', e.target.value)}
                          className="wizard-input"
                        >
                          <option value="Vacation / Leisure">🌴 Vacation / Leisure</option>
                          <option value="Honeymoon / Romantic Getaway">💍 Honeymoon / Romantic Getaway</option>
                          <option value="Family Holiday">👨‍👩‍👧‍👦 Family Holiday</option>
                          <option value="Cultural Heritage & Roots Tour">🏛️ Cultural Heritage &amp; Roots Tour</option>
                          <option value="Festival & Concert Adventure">🎉 Festival &amp; Concert Adventure</option>
                          <option value="Corporate / Business Retreat">💼 Corporate / Business Retreat</option>
                          <option value="Solo Discovery">🎒 Solo Discovery</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: Preferences & Budget */}
                  {step === 4 && (
                    <div className="wizard-step-content">
                      <div className="step-intro-header">
                        <div className="step-intro-icon">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="step-intro-title">Preferences &amp; Budget</h4>
                          <p className="step-intro-sub">Help us tailor the perfect accommodation and activities.</p>
                        </div>
                      </div>

                      <div className="wizard-fields-grid-2">
                        <div className="field-group">
                          <label className="field-label">Accommodation Level</label>
                          <select
                            value={formData.accommodation}
                            onChange={(e) => updateField('accommodation', e.target.value)}
                            className="wizard-input"
                          >
                            <option value="5-Star Luxury Resort / Villa">⭐⭐⭐⭐⭐ 5-Star Luxury Resort / Villa</option>
                            <option value="4-Star Premium Hotel">⭐⭐⭐⭐ 4-Star Premium Hotel</option>
                            <option value="3-Star Comfortable Hotel">⭐⭐⭐ 3-Star Comfortable Hotel</option>
                            <option value="Boutique Heritage Lodge">🏡 Boutique Heritage Lodge</option>
                          </select>
                        </div>

                        <div className="field-group">
                          <label className="field-label">Estimated Budget per Person</label>
                          <select
                            value={formData.budgetPerPerson}
                            onChange={(e) => updateField('budgetPerPerson', e.target.value)}
                            className="wizard-input"
                          >
                            <option value="Under $1,000">Under $1,000</option>
                            <option value="$1,000 - $2,500">$1,000 - $2,500</option>
                            <option value="$2,500 - $5,000">$2,500 - $5,000</option>
                            <option value="$5,000+ (Luxury VIP)">$5,000+ (Luxury VIP)</option>
                          </select>
                        </div>
                      </div>

                      <div className="field-group" style={{ marginTop: '16px' }}>
                        <label className="field-label">Special Requests / Itinerary Notes</label>
                        <textarea
                          rows={3}
                          placeholder="Tell us any specific attractions, dietary needs, special celebrations, or activities you want included..."
                          value={formData.specialRequests}
                          onChange={(e) => updateField('specialRequests', e.target.value)}
                          className="wizard-textarea"
                        />
                      </div>
                    </div>
                  )}

                  {/* Bottom Navigation Controls & Dots */}
                  <div className="wizard-footer-controls">
                    {step > 1 ? (
                      <button
                        type="button"
                        onClick={handleBack}
                        className="btn-wizard-back"
                        disabled={loading}
                      >
                        &larr; Back
                      </button>
                    ) : (
                      <div />
                    )}

                    {/* Step Indicator Dots */}
                    <div className="wizard-dots">
                      {[1, 2, 3, 4].map((i) => (
                        <span
                          key={i}
                          className={`w-dot ${i === step ? 'active' : ''} ${i < step ? 'completed' : ''}`}
                        />
                      ))}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-wizard-next"
                    >
                      {loading ? (
                        'Submitting…'
                      ) : step === 4 ? (
                        'Submit Plan →'
                      ) : (
                        'Next >'
                      )}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              /* Success State */
              <div className="wizard-success-state">
                <div className="success-icon-badge">🎉</div>
                <h3 className="success-title">Your Custom Trip Request Has Been Received!</h3>
                <p className="success-sub">
                  Thank you, <strong>{formData.fullName}</strong>. Our destination specialists are crafting a personalized itinerary for <strong>{formData.destination}</strong>. We will contact you via WhatsApp/Email within 24 hours.
                </p>

                <div className="success-summary-box">
                  <div><strong>Destination:</strong> {formData.destination}</div>
                  <div><strong>Travelers:</strong> {formData.adults} Adults, {formData.children} Children</div>
                  <div><strong>Duration:</strong> {formData.durationDays} Days</div>
                  <div><strong>Contact:</strong> {formData.phone} | {formData.email}</div>
                </div>

                <div className="success-actions">
                  <a
                    href={`https://wa.me/233244311267?text=${encodeURIComponent(`Hello Sunseekers Tours! I just submitted a custom trip request for ${formData.destination} (${formData.durationDays} days).`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-green"
                  >
                    💬 Quick WhatsApp Chat
                  </a>
                  <Link href="/tours" className="btn btn-ghost" style={{ color: '#1e293b' }}>
                    Browse Tours
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
