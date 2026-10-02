'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
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

export interface ProductCategoryTab {
  key: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
}

export const PRODUCT_CATEGORY_TABS: ProductCategoryTab[] = [
  { key: 'ALL', label: 'All', icon: '🌟', color: '#0f172a', bg: '#f1f5f9', border: '#cbd5e1' },
  { key: 'TOUR_INBOUND', label: 'Inbound', icon: '🌍', color: '#166534', bg: '#f0fdf4', border: '#bbf7d0' },
  { key: 'TOUR_OUTBOUND', label: 'Outbound', icon: '✈️', color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe' },
  { key: 'FLEET', label: 'Fleet & Rental', icon: '🚐', color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  { key: 'HOTEL', label: 'Hotels', icon: '🏨', color: '#5b21b6', bg: '#f5f3ff', border: '#ddd6fe' },
  { key: 'FLIGHT', label: 'Flights', icon: '🎫', color: '#155e75', bg: '#ecfeff', border: '#a5f3fc' },
  { key: 'OTHER', label: 'Other', icon: '📦', color: '#334155', bg: '#f8fafc', border: '#e2e8f0' },
];

export function getProductCategoryMeta(cat?: string): ProductCategoryTab {
  if (!cat) return PRODUCT_CATEGORY_TABS[6];
  const upper = cat.toUpperCase();
  if (upper.includes('INBOUND') || upper.includes('GHANA')) return PRODUCT_CATEGORY_TABS[1];
  if (upper.includes('OUTBOUND') || upper.includes('INTERNATIONAL')) return PRODUCT_CATEGORY_TABS[2];
  if (upper.includes('FLEET') || upper.includes('CAR_RENTAL') || upper.includes('TRANSPORT') || upper.includes('BUS')) return PRODUCT_CATEGORY_TABS[3];
  if (upper.includes('HOTEL')) return PRODUCT_CATEGORY_TABS[4];
  if (upper.includes('FLIGHT') || upper.includes('AIR')) return PRODUCT_CATEGORY_TABS[5];
  return PRODUCT_CATEGORY_TABS.find((t) => t.key === cat) || PRODUCT_CATEGORY_TABS[6];
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

export default function ProductSearchPicker({
  label = 'Product / Package from Catalog',
  selectedProductId,
  selectedProductName,
  onSelect,
  onChange,
  placeholder = 'Select product from catalog...',
}: ProductSearchPickerProps) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('ALL');
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
        const res = await api.get<Paginated<ProductItem>>('/products?limit=200');
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

  // Filter products by tab and query
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (activeTab !== 'ALL') {
        const meta = getProductCategoryMeta(p.category);
        if (meta.key !== activeTab) return false;
      }
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    });
  }, [products, activeTab, query]);

  function handleChooseProduct(prod: ProductItem) {
    setSelectedProduct(prod);
    setIsOpen(false);
    setQuery('');
    onSelect?.(prod);
    onChange?.(prod.id, prod);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedProduct(null);
    setQuery('');
    onSelect?.(null);
    onChange?.('', null);
  }

  const meta = selectedProduct ? getProductCategoryMeta(selectedProduct.category) : null;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {label && (
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
          {label}
        </label>
      )}

      {/* COMPACT TRIGGER BUTTON / DISPLAY */}
      {selectedProduct ? (
        <div
          onClick={() => setIsOpen((prev) => !prev)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '7px 12px',
            background: meta?.bg || '#f8fafc',
            border: `1.5px solid ${meta?.border || '#cbd5e1'}`,
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            minHeight: '40px',
          }}
          title="Click to change selected product"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, overflow: 'hidden' }}>
            <span style={{ fontSize: 16 }}>{meta?.icon || '📦'}</span>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selectedProduct.name}
            </span>
            {selectedProduct.price != null && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#15803d',
                  background: '#dcfce7',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  whiteSpace: 'nowrap',
                }}
              >
                {selectedProduct.currency || '$'} {Number(selectedProduct.price).toLocaleString()}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <button
              type="button"
              onClick={handleClear}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                fontSize: 14,
                padding: '2px 6px',
                borderRadius: '4px',
                lineHeight: 1,
              }}
              title="Remove product selection"
            >
              ✕
            </button>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>▾</span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#64748b',
            cursor: 'pointer',
            textAlign: 'left',
            minHeight: '40px',
            transition: 'border-color 0.15s ease',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span>📦</span>
            <span>{placeholder}</span>
          </span>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>▾</span>
        </button>
      )}

      {/* FLOATING DROPDOWN LIST POPOVER */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
            zIndex: 100,
            padding: '10px',
            maxHeight: '380px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Search Input inside popover */}
          <div style={{ position: 'relative', marginBottom: '8px' }}>
            <input
              type="text"
              autoFocus
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to filter products..."
              style={{ width: '100%', padding: '7px 10px 7px 28px', fontSize: '12px' }}
            />
            <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#94a3b8' }}>
              🔍
            </span>
          </div>

          {/* Compact Category Tabs */}
          <div
            style={{
              display: 'flex',
              gap: 4,
              overflowX: 'auto',
              paddingBottom: 6,
              marginBottom: 6,
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {PRODUCT_CATEGORY_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    padding: '3px 8px',
                    borderRadius: 14,
                    fontSize: 11,
                    fontWeight: isActive ? 700 : 500,
                    border: `1px solid ${isActive ? tab.border : '#e2e8f0'}`,
                    background: isActive ? tab.bg : '#ffffff',
                    color: isActive ? tab.color : '#64748b',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Product Items List */}
          <div style={{ overflowY: 'auto', flex: 1, maxHeight: '220px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {loading ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: 12 }}>
                Loading catalog...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                No products found matching &quot;{query}&quot;
              </div>
            ) : (
              filteredProducts.map((p) => {
                const itemMeta = getProductCategoryMeta(p.category);
                const isSelected = selectedProduct?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleChooseProduct(p)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      background: isSelected ? '#f1f5f9' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{ fontSize: 14 }}>{itemMeta.icon}</span>
                      <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {itemMeta.label}
                        </div>
                      </div>
                    </div>

                    {p.price != null && (
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', flexShrink: 0, marginLeft: 8 }}>
                        {p.currency || '$'} {Number(p.price).toLocaleString()}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
