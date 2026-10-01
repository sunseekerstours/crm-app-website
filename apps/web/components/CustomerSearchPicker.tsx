'use client';

import { useEffect, useRef, useState } from 'react';
import { api, Paginated } from '@/lib/api';

export interface CustomerSummary {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  country?: string;
}

export function CustomerSearchPicker({
  value,
  onSelect,
  onChange,
  selectedCustomer,
  label = 'Customer',
  required = false,
  onAddNew,
  onQuickAdd,
  onViewDetails,
}: {
  value?: string;
  onSelect?: (customer: CustomerSummary | null) => void;
  onChange?: (customerId: string, customer: CustomerSummary | null) => void;
  selectedCustomer?: CustomerSummary | null;
  label?: string;
  required?: boolean;
  onAddNew?: () => void;
  onQuickAdd?: () => void;
  onViewDetails?: (customerId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CustomerSummary[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState<CustomerSummary | null>(selectedCustomer || null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedCustomer) {
      setCurrent(selectedCustomer);
    } else if (value && (!current || current.id !== value)) {
      api.get<CustomerSummary>(`/customers/${value}`)
        .then((c) => setCurrent(c))
        .catch(() => {});
    } else if (!value) {
      setCurrent(null);
    }
  }, [value, selectedCustomer]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      setLoading(true);
      const q = new URLSearchParams({ limit: '20' });
      if (query.trim()) q.set('search', query.trim());
      api.get<Paginated<CustomerSummary>>(`/customers?${q.toString()}`)
        .then((res) => setResults(res.items ?? []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  const handleChoose = (c: CustomerSummary) => {
    setCurrent(c);
    onSelect?.(c);
    onChange?.(c.id, c);
    setIsOpen(false);
    setQuery('');
  };

  const handleClear = () => {
    setCurrent(null);
    onSelect?.(null);
    onChange?.('', null);
    setQuery('');
  };

  const quickAddAction = onQuickAdd || onAddNew;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
          {label} {required ? <span style={{ color: '#ef4444' }}>*</span> : null}
        </label>
        {quickAddAction && (
          <button
            type="button"
            onClick={quickAddAction}
            style={{
              background: 'none',
              border: 'none',
              color: '#0284c7',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            + Quick Add Customer
          </button>
        )}
      </div>

      {current ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            background: '#f8fafc',
            border: '1.5px solid #0284c7',
            borderRadius: '10px',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {`${current.firstName?.[0] || ''}${current.lastName?.[0] || ''}`.toUpperCase() || '👤'}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {`${current.firstName ?? ''} ${current.lastName ?? ''}`.trim() || 'Named Customer'}
                {current.country && (
                  <span style={{ marginLeft: '6px', fontSize: '11px', fontWeight: 500, color: '#64748b' }}>
                    ({current.country})
                  </span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {current.phone ? `📞 ${current.phone}` : ''}
                {current.phone && current.email ? ' • ' : ''}
                {current.email ? `✉️ ${current.email}` : ''}
                {!current.phone && !current.email ? 'No contact on file' : ''}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {onViewDetails && (
              <button
                type="button"
                onClick={() => onViewDetails(current.id)}
                style={{
                  padding: '5px 9px',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '6px',
                  color: '#1d4ed8',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                title="View full customer profile"
              >
                👁️ Details
              </button>
            )}
            <button
              type="button"
              onClick={handleClear}
              style={{
                padding: '5px 9px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                color: '#64748b',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="Change customer"
            >
              ✕ Change
            </button>
          </div>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: '12px', fontSize: '14px', color: '#94a3b8', pointerEvents: 'none' }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Search customer by name, email, or phone…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!isOpen) setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              style={{
                width: '100%',
                padding: '10px 14px 10px 36px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                background: '#ffffff',
                boxShadow: isOpen ? '0 0 0 3px rgba(2, 132, 199, 0.15)' : 'none',
                borderColor: isOpen ? '#0284c7' : '#cbd5e1',
                transition: 'all 0.15s ease',
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                ✕
              </button>
            )}
          </div>

          {isOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                background: '#ffffff',
                borderRadius: '10px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e2e8f0',
                zIndex: 9999,
                maxHeight: '260px',
                overflowY: 'auto',
              }}
            >
              {loading ? (
                <div style={{ padding: '14px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
                  Searching customers…
                </div>
              ) : results.length > 0 ? (
                <div>
                  <div style={{ padding: '8px 12px 4px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                    Select Customer
                  </div>
                  {results.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleChoose(c)}
                      style={{
                        padding: '10px 14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0f9ff')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: '#e0f2fe',
                            color: '#0284c7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          {`${c.firstName?.[0] || ''}${c.lastName?.[0] || ''}`.toUpperCase() || '👤'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>
                            {`${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || 'Unnamed'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {c.phone ? `📞 ${c.phone}` : ''}
                            {c.phone && c.email ? ' • ' : ''}
                            {c.email ? `✉️ ${c.email}` : ''}
                          </div>
                        </div>
                      </div>
                      {c.country && (
                        <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px' }}>
                          {c.country}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '16px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#64748b' }}>
                    No customer matching &quot;{query}&quot;
                  </p>
                  {onAddNew && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onAddNew();
                      }}
                      style={{
                        padding: '6px 12px',
                        background: '#0284c7',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      + Create New Customer
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
