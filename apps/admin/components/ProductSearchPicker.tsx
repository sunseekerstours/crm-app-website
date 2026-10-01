'use client';

import React, { useEffect, useState, useRef } from 'react';
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

interface ProductSearchPickerProps {
  label?: string;
  selectedProductId?: string | null;
  selectedProductName?: string | null;
  onSelect?: (product: ProductItem | null) => void;
  onChange?: (productId: string, product: ProductItem | null) => void;
  placeholder?: string;
  required?: boolean;
}

export function getProductCategoryMeta(cat?: string) {
  if (!cat) return { label: 'Product', icon: '📦', color: '#475569', bg: '#f8fafc', border: '#e2e8f0' };
  if (cat.includes('INBOUND') || cat.includes('GHANA')) return { label: 'Tour (Inbound)', icon: '🌍', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' };
  if (cat.includes('OUTBOUND') || cat.includes('INTERNATIONAL')) return { label: 'Tour (Outbound)', icon: '✈️', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' };
  if (cat.includes('FLEET') || cat.includes('CAR_RENTAL') || cat.includes('TRANSPORT')) return { label: 'Fleet / Bus', icon: '🚐', color: '#d97706', bg: '#fffbeb', border: '#fde68a' };
  if (cat.includes('HOTEL')) return { label: 'Hotel Booking', icon: '🏨', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' };
  if (cat.includes('FLIGHT')) return { label: 'Flight Booking', icon: '🎫', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' };
  return { label: cat.replace('_', ' '), icon: '📦', color: '#475569', bg: '#f8fafc', border: '#e2e8f0' };
}

export default function ProductSearchPicker({
  label = 'Select Product / Service',
  selectedProductId,
  selectedProductName,
  onSelect,
  onChange,
  placeholder = '🔍 Search tour, fleet, hotel, or flight...',
  required = false,
}: ProductSearchPickerProps) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load products on mount
  useEffect(() => {
    let active = true;
    async function fetchProducts() {
      setLoading(true);
      try {
        const res = await api.get<Paginated<ProductItem>>('/products?limit=100');
        if (active) {
          const items = res.items || [];
          setProducts(items);
          if (selectedProductId) {
            const match = items.find((p) => p.id === selectedProductId);
            if (match) setSelectedProduct(match);
          } else if (selectedProductName) {
            const match = items.find((p) => p.name.toLowerCase() === selectedProductName.toLowerCase());
            if (match) setSelectedProduct(match);
          }
        }
      } catch (err) {
        console.error('Failed to load products in picker:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    void fetchProducts();
    return () => {
      active = false;
    };
  }, [selectedProductId, selectedProductName]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredProducts = products.filter((p) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  });

  function handleSelect(p: ProductItem | null) {
    setSelectedProduct(p);
    setIsOpen(false);
    setQuery('');
    if (onSelect) onSelect(p);
    if (onChange) onChange(p ? p.id : '', p);
  }

  const meta = selectedProduct ? getProductCategoryMeta(selectedProduct.category) : null;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', marginBottom: 12 }}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 700,
            color: '#334155',
            marginBottom: '5px',
          }}
        >
          {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
      )}

      {/* SELECTED PRODUCT CHIP */}
      {selectedProduct ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: meta?.bg || '#f8fafc',
            border: `1.5px solid ${meta?.border || '#cbd5e1'}`,
            borderRadius: '8px',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>{meta?.icon || '📦'}</span>
            <div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>
                {selectedProduct.name}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: meta?.color || '#475569',
                    textTransform: 'uppercase',
                  }}
                >
                  {meta?.label}
                </span>
                {selectedProduct.price != null && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>
                    • {selectedProduct.currency ?? 'GHS'} {Number(selectedProduct.price).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleSelect(null)}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#64748b',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Change
          </button>
        </div>
      ) : (
        /* SEARCH INPUT */
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="input"
            value={query}
            placeholder={loading ? 'Loading catalog products...' : placeholder}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            style={{
              width: '100%',
              paddingLeft: '32px',
              height: '38px',
              fontSize: '13px',
              borderRadius: '8px',
            }}
          />
          <span
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 14,
              pointerEvents: 'none',
              color: '#94a3b8',
            }}
          >
            🔍
          </span>
        </div>
      )}

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            marginTop: 4,
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {filteredProducts.length === 0 ? (
            <div style={{ padding: '12px 14px', fontSize: 13, color: '#64748b', textAlign: 'center' }}>
              No products found matching &quot;{query}&quot;
            </div>
          ) : (
            filteredProducts.map((p) => {
              const itemMeta = getProductCategoryMeta(p.category);
              return (
                <div
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  style={{
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f1f5f9',
                    transition: 'background 0.1s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>{itemMeta.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: itemMeta.color, fontWeight: 600 }}>
                        {itemMeta.label}
                      </div>
                    </div>
                  </div>
                  {p.price != null ? (
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>
                      {p.currency ?? 'GHS'} {Number(p.price).toLocaleString()}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
