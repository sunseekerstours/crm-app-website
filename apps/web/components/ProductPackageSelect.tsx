'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { api, Paginated } from '@/lib/api';

export interface ProductItem {
  id: string;
  name: string;
  slug?: string;
  category?: string;
  description?: string;
  price?: number | string | null;
  currency?: string;
  isActive?: boolean;
}

export interface ProductPackageSelectProps {
  label?: string;
  selectedProductName?: string;
  priceValue?: string | number;
  currencyValue?: string;
  isSavedRecord?: boolean; // true when editing an existing lead or booking
  isAdmin?: boolean;       // true if user has admin permission
  onSelectProduct: (product: ProductItem | null, newPrice?: string, newCurrency?: string) => void;
  onPriceChange: (newPrice: string) => void;
  onCurrencyChange?: (newCurrency: string) => void;
  // Bookings specific:
  isBooking?: boolean;
  paxCount?: number | string;
  onPaxChange?: (newPax: string) => void;
  totalPrice?: string | number;
  onTotalPriceChange?: (newTotal: string) => void;
}

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'GHS', label: 'GHS (₵)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
];

export default function ProductPackageSelect({
  label = 'Products / Package',
  selectedProductName = '',
  priceValue = '',
  currencyValue = 'USD',
  isSavedRecord = false,
  isAdmin = false,
  onSelectProduct,
  onPriceChange,
  onCurrencyChange,
  isBooking = false,
  paxCount = 1,
  onPaxChange,
  totalPrice = '',
  onTotalPriceChange,
}: ProductPackageSelectProps) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);
  const [customName, setCustomName] = useState('');

  // Lock state: Once saved, only admin can edit
  const isLocked = isSavedRecord && !isAdmin;

  // Fetch admin-created products from API
  useEffect(() => {
    let active = true;
    async function loadProducts() {
      setLoading(true);
      try {
        const res = await api.get<Paginated<ProductItem>>('/products?limit=250');
        if (active && res.items) {
          setProducts(res.items);
        }
      } catch (err) {
        console.error('Failed to load products for dropdown:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadProducts();
    return () => {
      active = false;
    };
  }, []);

  // Sync selectedId when selectedProductName changes
  useEffect(() => {
    if (!selectedProductName) {
      setSelectedId('');
      setIsCustom(false);
      return;
    }
    const match = products.find(
      (p) => p.name.trim().toLowerCase() === selectedProductName.trim().toLowerCase(),
    );
    if (match) {
      setSelectedId(match.id);
      setIsCustom(false);
    } else {
      setSelectedId('CUSTOM');
      setIsCustom(true);
      setCustomName(selectedProductName);
    }
  }, [selectedProductName, products]);

  // Group products by category
  const groupedProducts = useMemo(() => {
    const groups: Record<string, ProductItem[]> = {
      'Tours & Packages': [],
      'Fleet & Charter': [],
      'Hotels & Lodging': [],
      'Flights & Air Travel': [],
      'Other Services': [],
    };

    products.forEach((p) => {
      const cat = (p.category || '').toUpperCase();
      if (cat.includes('TOUR') || cat.includes('INBOUND') || cat.includes('OUTBOUND')) {
        groups['Tours & Packages'].push(p);
      } else if (cat.includes('FLEET') || cat.includes('RENTAL') || cat.includes('CAR') || cat.includes('BUS')) {
        groups['Fleet & Charter'].push(p);
      } else if (cat.includes('HOTEL')) {
        groups['Hotels & Lodging'].push(p);
      } else if (cat.includes('FLIGHT') || cat.includes('AIR')) {
        groups['Flights & Air Travel'].push(p);
      } else {
        groups['Other Services'].push(p);
      }
    });

    return groups;
  }, [products]);

  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (isLocked) return;
    const val = e.target.value;
    setSelectedId(val);

    if (!val) {
      setIsCustom(false);
      onSelectProduct(null, '', currencyValue);
      return;
    }

    if (val === 'CUSTOM') {
      setIsCustom(true);
      onSelectProduct(
        { id: 'custom', name: customName || 'Custom Package', price: priceValue, currency: currencyValue },
        String(priceValue || ''),
        currencyValue,
      );
      return;
    }

    setIsCustom(false);
    const prod = products.find((p) => p.id === val);
    if (prod) {
      const pPrice = prod.price != null ? String(prod.price) : '';
      const pCurr = prod.currency || currencyValue || 'USD';
      onSelectProduct(prod, pPrice, pCurr);
      onPriceChange(pPrice);
      if (onCurrencyChange) onCurrencyChange(pCurr);

      if (isBooking && onTotalPriceChange) {
        const u = Number(pPrice) || 0;
        const pax = Number(paxCount) || 1;
        onTotalPriceChange(u > 0 ? String(u * pax) : '');
      }
    }
  }

  function handleCustomNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (isLocked) return;
    const val = e.target.value;
    setCustomName(val);
    onSelectProduct(
      { id: 'custom', name: val, price: priceValue, currency: currencyValue },
      String(priceValue || ''),
      currencyValue,
    );
  }

  function handlePriceInput(val: string) {
    if (isLocked) return;
    onPriceChange(val);
    if (isBooking && onTotalPriceChange) {
      const u = Number(val) || 0;
      const pax = Number(paxCount) || 1;
      onTotalPriceChange(u > 0 ? String(u * pax) : '');
    }
  }

  function handlePaxInput(val: string) {
    if (isLocked) return;
    if (onPaxChange) onPaxChange(val);
    if (isBooking && onTotalPriceChange) {
      const u = Number(priceValue) || 0;
      const pax = Number(val) || 1;
      onTotalPriceChange(u > 0 ? String(u * pax) : '');
    }
  }

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        overflow: 'hidden',
        marginBottom: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {/* Tab Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 16px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              background: '#0b6e4f',
              color: '#ffffff',
              padding: '3px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            📦 {label}
          </span>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Choose an admin-created product or custom package with editable pricing
          </span>
        </div>

        {/* Lock / Admin Badge */}
        {isSavedRecord && (
          <div>
            {isLocked ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#fef2f2',
                  color: '#b91c1c',
                  border: '1px solid #fecaca',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
                title="Only administrators can modify pricing on saved records"
              >
                🔒 Price Locked (Admin Only)
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#f0fdf4',
                  color: '#15803d',
                  border: '1px solid #bbf7d0',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                👑 Admin Pricing Override Active
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Form Fields Inside Tab */}
      <div style={{ padding: '16px', display: 'grid', gap: '14px' }}>
        {/* Dropdown Field */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
            Select Product / Package {loading && <span style={{ fontSize: '11px', color: '#64748b' }}>(Loading catalog...)</span>}
          </label>
          <select
            value={selectedId}
            onChange={handleSelectChange}
            disabled={isLocked}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: isLocked ? '1px solid #e2e8f0' : '1.5px solid #0b6e4f',
              background: isLocked ? '#f8fafc' : '#ffffff',
              color: isLocked ? '#64748b' : '#0f172a',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isLocked ? 'not-allowed' : 'pointer',
              outline: 'none',
            }}
          >
            <option value="">-- Click to Select an Available Product / Package --</option>
            {Object.entries(groupedProducts).map(([groupName, items]) => {
              if (items.length === 0) return null;
              return (
                <optgroup key={groupName} label={groupName}>
                  {items.map((prod) => {
                    const priceTag = prod.price != null ? ` — ${prod.currency || 'USD'} ${Number(prod.price).toLocaleString()}` : '';
                    return (
                      <option key={prod.id} value={prod.id}>
                        {prod.name} {priceTag}
                      </option>
                    );
                  })}
                </optgroup>
              );
            })}
            <optgroup label="Custom / Other">
              <option value="CUSTOM">✍️ Custom Package (Enter custom name &amp; rate)</option>
            </optgroup>
          </select>
        </div>

        {/* If Custom Package Selected */}
        {isCustom && (
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Custom Package / Tour Name *
            </label>
            <input
              type="text"
              value={customName}
              onChange={handleCustomNameChange}
              disabled={isLocked}
              placeholder="e.g. Accra City Cultural Safari & Coastal Tour"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                background: isLocked ? '#f8fafc' : '#ffffff',
              }}
            />
          </div>
        )}

        {/* Price & Currency Controls (Editable before save; locked for non-admins once saved) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isBooking ? '2fr 1fr 1fr 2fr' : '2fr 1fr',
            gap: '12px',
            alignItems: 'end',
            background: '#f8fafc',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}
        >
          {/* Unit / Expected Price */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                {isBooking ? 'Unit Rate / Price *' : 'Expected Price / Deal Value *'}
              </label>
              {!isLocked && (
                <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                  ✏️ Editable before save
                </span>
              )}
            </div>
            <input
              type="number"
              step="any"
              min="0"
              value={priceValue ?? ''}
              onChange={(e) => handlePriceInput(e.target.value)}
              disabled={isLocked}
              placeholder="0.00"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: isLocked ? '1px solid #cbd5e1' : '1.5px solid #059669',
                fontSize: '14px',
                fontWeight: 700,
                background: isLocked ? '#e2e8f0' : '#ffffff',
                color: isLocked ? '#64748b' : '#0f172a',
                cursor: isLocked ? 'not-allowed' : 'text',
              }}
            />
          </div>

          {/* Currency */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
              Currency
            </label>
            <select
              value={currencyValue}
              onChange={(e) => onCurrencyChange && onCurrencyChange(e.target.value)}
              disabled={isLocked}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                fontWeight: 700,
                background: isLocked ? '#e2e8f0' : '#ffffff',
                cursor: isLocked ? 'not-allowed' : 'pointer',
              }}
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Booking specific: Pax count and Calculated Total */}
          {isBooking && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                  Pax (Travelers)
                </label>
                <input
                  type="number"
                  min="1"
                  value={paxCount}
                  onChange={(e) => handlePaxInput(e.target.value)}
                  disabled={isLocked}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 700,
                    background: isLocked ? '#e2e8f0' : '#ffffff',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                  Total Booking Value
                </label>
                <input
                  type="number"
                  step="any"
                  value={totalPrice ?? ''}
                  onChange={(e) => onTotalPriceChange && onTotalPriceChange(e.target.value)}
                  disabled={isLocked}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1.5px solid #0284c7',
                    fontSize: '14px',
                    fontWeight: 800,
                    background: isLocked ? '#e2e8f0' : '#f0f9ff',
                    color: isLocked ? '#64748b' : '#0369a1',
                  }}
                />
              </div>
            </>
          )}
        </div>

        {/* Lock explanation for non-admins */}
        {isLocked && (
          <div style={{ fontSize: '11px', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>🔒</span> This record has been saved. As a CRM user, pricing and packages are locked. Please contact an Admin to adjust.
          </div>
        )}
      </div>
    </div>
  );
}
