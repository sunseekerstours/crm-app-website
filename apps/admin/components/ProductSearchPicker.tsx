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
  { key: 'ALL', label: 'All Products', icon: '🌟', color: '#0f172a', bg: '#f1f5f9', border: '#cbd5e1' },
  { key: 'TOUR_INBOUND', label: 'Inbound Tours', icon: '🌍', color: '#166534', bg: '#f0fdf4', border: '#bbf7d0' },
  { key: 'TOUR_OUTBOUND', label: 'Outbound Tours', icon: '✈️', color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe' },
  { key: 'FLEET', label: 'Fleet & Rental', icon: '🚐', color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  { key: 'HOTEL', label: 'Hotels', icon: '🏨', color: '#5b21b6', bg: '#f5f3ff', border: '#ddd6fe' },
  { key: 'FLIGHT', label: 'Flights', icon: '🎫', color: '#155e75', bg: '#ecfeff', border: '#a5f3fc' },
  { key: 'OTHER', label: 'Packages / Other', icon: '📦', color: '#334155', bg: '#f8fafc', border: '#e2e8f0' },
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
  showCategoryTabs?: boolean;
  allowCustom?: boolean;
}

export default function ProductSearchPicker({
  label = 'Select Available Product / Package',
  selectedProductId,
  selectedProductName,
  onSelect,
  onChange,
  placeholder = '🔍 Search tour, fleet vehicle, hotel, or flight in catalog...',
  required = false,
  showCategoryTabs = true,
  allowCustom = true,
}: ProductSearchPickerProps) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
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
            if (match) {
              setSelectedProduct(match);
            } else {
              setCustomName(selectedProductName);
            }
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
      // Tab filter
      if (activeTab !== 'ALL') {
        const meta = getProductCategoryMeta(p.category);
        if (meta.key !== activeTab) return false;
      }
      // Query filter
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    });
  }, [products, activeTab, query]);

  // Quick picks: first 6 items for the active category
  const quickPicks = useMemo(() => {
    return filteredProducts.slice(0, 6);
  }, [filteredProducts]);

  function handleSelect(p: ProductItem | null) {
    setSelectedProduct(p);
    setIsCustomMode(false);
    setIsOpen(false);
    setQuery('');
    if (onSelect) onSelect(p);
    if (onChange) onChange(p ? p.id : '', p);
  }

  function handleCustomSave() {
    if (!customName.trim()) return;
    const fakeProduct: ProductItem = {
      id: 'custom-' + Date.now(),
      name: customName.trim(),
      category: 'CUSTOM',
      price: null,
      currency: 'USD',
    };
    setSelectedProduct(fakeProduct);
    setIsCustomMode(false);
    setIsOpen(false);
    if (onSelect) onSelect(fakeProduct);
    if (onChange) onChange('', fakeProduct);
  }

  const meta = selectedProduct ? getProductCategoryMeta(selectedProduct.category) : null;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', marginBottom: 14 }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#334155',
            }}
          >
            {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
          </label>
          {products.length > 0 && (
            <span style={{ fontSize: 11, color: '#64748b' }}>
              {products.length} available catalog items
            </span>
          )}
        </div>
      )}

      {/* CATEGORY TABS (when no product is selected or when opened) */}
      {showCategoryTabs && !selectedProduct && (
        <div
          style={{
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            paddingBottom: 6,
            marginBottom: 8,
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {PRODUCT_CATEGORY_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = tab.key === 'ALL'
              ? products.length
              : products.filter((p) => getProductCategoryMeta(p.category).key === tab.key).length;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key);
                  setIsOpen(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 10px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: isActive ? 700 : 600,
                  border: `1.5px solid ${isActive ? tab.border : '#e2e8f0'}`,
                  background: isActive ? tab.bg : '#ffffff',
                  color: isActive ? tab.color : '#64748b',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: 10,
                    background: isActive ? 'rgba(0,0,0,0.08)' : '#f1f5f9',
                    padding: '1px 5px',
                    borderRadius: 10,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
          {allowCustom && (
            <button
              type="button"
              onClick={() => {
                setIsCustomMode(true);
                setIsOpen(false);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: isCustomMode ? 700 : 600,
                border: `1.5px solid ${isCustomMode ? '#cbd5e1' : '#e2e8f0'}`,
                background: isCustomMode ? '#f8fafc' : '#ffffff',
                color: isCustomMode ? '#0f172a' : '#64748b',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <span>✏️</span>
              <span>Custom Package</span>
            </button>
          )}
        </div>
      )}

      {/* SELECTED PRODUCT CARD */}
      {selectedProduct ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            background: meta?.bg || '#f8fafc',
            border: `2px solid ${meta?.border || '#cbd5e1'}`,
            borderRadius: '10px',
            gap: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>{meta?.icon || '📦'}</span>
            <div>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>
                {selectedProduct.name}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 3, flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: meta?.color || '#475569',
                    textTransform: 'uppercase',
                    background: '#ffffff',
                    padding: '1px 6px',
                    borderRadius: 4,
                    border: `1px solid ${meta?.border || '#cbd5e1'}`,
                  }}
                >
                  {meta?.label}
                </span>
                {selectedProduct.price != null && (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: '#15803d',
                      background: '#dcfce7',
                      padding: '1px 8px',
                      borderRadius: 4,
                    }}
                  >
                    Catalog Price: {selectedProduct.currency ?? 'USD'} {Number(selectedProduct.price).toLocaleString()}
                  </span>
                )}
                {selectedProduct.category === 'CUSTOM' && (
                  <span style={{ fontSize: 11, color: '#64748b' }}>(Custom package)</span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleSelect(null)}
            style={{
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              color: '#475569',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>🔄</span> Change
          </button>
        </div>
      ) : isCustomMode ? (
        /* CUSTOM PACKAGE INPUT */
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            className="input"
            value={customName}
            placeholder="Type custom tour, package, or vehicle name..."
            onChange={(e) => setCustomName(e.target.value)}
            style={{ flex: 1, padding: '9px 12px', fontSize: 13, borderRadius: 8 }}
            autoFocus
          />
          <button
            type="button"
            onClick={handleCustomSave}
            disabled={!customName.trim()}
            style={{
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '9px 16px',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setIsCustomMode(false)}
            style={{
              background: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '9px 12px',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Back
          </button>
        </div>
      ) : (
        /* SEARCH INPUT & QUICK PICKS */
        <div>
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
                paddingLeft: '34px',
                height: '40px',
                fontSize: '13px',
                borderRadius: '8px',
                border: isOpen ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
              }}
            />
            <span
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 15,
                pointerEvents: 'none',
                color: '#94a3b8',
              }}
            >
              🔍
            </span>
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick-Pick Chips under search bar */}
          {!isOpen && quickPicks.length > 0 && !query && (
            <div
              style={{
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
                marginTop: 6,
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Quick pick:</span>
              {quickPicks.map((qp) => {
                const itemMeta = getProductCategoryMeta(qp.category);
                return (
                  <button
                    key={qp.id}
                    type="button"
                    onClick={() => handleSelect(qp)}
                    style={{
                      background: itemMeta.bg,
                      border: `1px solid ${itemMeta.border}`,
                      borderRadius: 14,
                      padding: '3px 8px',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#0f172a',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      transition: 'all 0.1s ease',
                    }}
                    title={qp.name}
                  >
                    <span>{itemMeta.icon}</span>
                    <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {qp.name}
                    </span>
                    {qp.price != null && (
                      <span style={{ color: '#166534', fontWeight: 700, fontSize: 10 }}>
                        {qp.currency ?? '$'}{Number(qp.price).toLocaleString()}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* DROPDOWN MENU */}
      {isOpen && !selectedProduct && !isCustomMode && (
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
            borderRadius: 10,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            maxHeight: 320,
            overflowY: 'auto',
          }}
        >
          {/* Header indicator */}
          <div
            style={{
              padding: '8px 12px',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: '#64748b',
              textTransform: 'uppercase',
            }}
          >
            <span>Available {activeTab === 'ALL' ? 'Products' : activeTab.replace('_', ' ')} ({filteredProducts.length})</span>
            {allowCustom && (
              <button
                type="button"
                onClick={() => {
                  setIsCustomMode(true);
                  setIsOpen(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0284c7',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 11,
                }}
              >
                + Type custom package
              </button>
            )}
          </div>

          {filteredProducts.length === 0 ? (
            <div style={{ padding: '16px', fontSize: 13, color: '#64748b', textAlign: 'center' }}>
              <div>No available products found matching &quot;{query}&quot;</div>
              {allowCustom && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomName(query);
                    setIsCustomMode(true);
                    setIsOpen(false);
                  }}
                  style={{
                    marginTop: 8,
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#1d4ed8',
                    borderRadius: 6,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Use &quot;{query}&quot; as custom package
                </button>
              )}
            </div>
          ) : (
            filteredProducts.map((p) => {
              const itemMeta = getProductCategoryMeta(p.category);
              return (
                <div
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  style={{
                    padding: '10px 14px',
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
                    <span style={{ fontSize: 20 }}>{itemMeta.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{p.name}</div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                        <span
                          style={{
                            fontSize: 10,
                            color: itemMeta.color,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                          }}
                        >
                          {itemMeta.label}
                        </span>
                        {p.description && (
                          <span
                            style={{
                              fontSize: 11,
                              color: '#94a3b8',
                              maxWidth: 240,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            • {p.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {p.price != null ? (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#166534' }}>
                        {p.currency ?? 'USD'} {Number(p.price).toLocaleString()}
                      </div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>catalog price</div>
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
