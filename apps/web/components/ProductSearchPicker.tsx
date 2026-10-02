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
}: ProductSearchPickerProps) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [query, setQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);

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
    const alreadySelected = selectedProduct?.id === prod.id;
    if (alreadySelected) {
      setSelectedProduct(null);
      onSelect?.(null);
      onChange?.('', null);
    } else {
      setSelectedProduct(prod);
      onSelect?.(prod);
      onChange?.(prod.id, prod);
    }
  }

  function handleClear() {
    setSelectedProduct(null);
    onSelect?.(null);
    onChange?.('', null);
  }

  const selectedMeta = selectedProduct ? getProductCategoryMeta(selectedProduct.category) : null;

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
          {label}
        </label>
      )}

      {/* Selected product banner */}
      {selectedProduct && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            marginBottom: 10,
            background: selectedMeta?.bg || '#f0fdf4',
            border: `2px solid ${selectedMeta?.border || '#86efac'}`,
            borderRadius: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>{selectedMeta?.icon || '📦'}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{selectedProduct.name}</div>
              <div style={{ fontSize: 12, color: '#475569' }}>
                {selectedMeta?.label}
                {selectedProduct.price != null && (
                  <span style={{ marginLeft: 8, fontWeight: 700, color: '#15803d' }}>
                    {selectedProduct.currency || 'USD'} {Number(selectedProduct.price).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            style={{
              background: 'rgba(0,0,0,0.06)',
              border: 'none',
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer',
            }}
          >
            ✕ Clear
          </button>
        </div>
      )}

      {/* Category Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          overflowX: 'auto',
          marginBottom: 8,
          paddingBottom: 2,
          WebkitOverflowScrolling: 'touch',
          flexWrap: 'wrap',
        }}
      >
        {PRODUCT_CATEGORY_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count =
            tab.key === 'ALL'
              ? products.length
              : products.filter((p) => getProductCategoryMeta(p.category).key === tab.key).length;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '5px 10px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: isActive ? 700 : 500,
                border: `1.5px solid ${isActive ? tab.border : '#e2e8f0'}`,
                background: isActive ? tab.bg : '#ffffff',
                color: isActive ? tab.color : '#64748b',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.12s ease',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {count > 0 && (
                <span
                  style={{
                    background: isActive ? tab.color : '#e2e8f0',
                    color: isActive ? '#fff' : '#64748b',
                    borderRadius: 10,
                    padding: '0 5px',
                    fontSize: 10,
                    fontWeight: 700,
                    minWidth: 16,
                    textAlign: 'center',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <span
          style={{
            position: 'absolute',
            left: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 14,
            color: '#94a3b8',
            pointerEvents: 'none',
          }}
        >
          🔍
        </span>
        <input
          type="text"
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products by name or category..."
          style={{ width: '100%', paddingLeft: 32, fontSize: 13 }}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: 14,
              padding: '0 4px',
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Product Table */}
      <div
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          overflow: 'hidden',
          maxHeight: 260,
          overflowY: 'auto',
        }}
      >
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
            Loading product catalog…
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            {query ? `No products match "${query}"` : 'No products in this category'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', position: 'sticky', top: 0 }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 12 }}>Product / Package</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 12, width: 130 }}>Category</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#475569', fontSize: 12, width: 120 }}>Price</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: '#475569', fontSize: 12, width: 70 }}>Select</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => {
                const itemMeta = getProductCategoryMeta(p.category);
                const isSelected = selectedProduct?.id === p.id;
                return (
                  <tr
                    key={p.id}
                    onClick={() => handleChooseProduct(p)}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: isSelected ? itemMeta.bg : 'transparent',
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
                    <td style={{ padding: '9px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15, flexShrink: 0 }}>{itemMeta.icon}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: isSelected ? 700 : 500, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 280 }}>
                            {p.name}
                          </div>
                          {p.description && (
                            <div style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 280 }}>
                              {p.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 600,
                          background: itemMeta.bg,
                          color: itemMeta.color,
                          border: `1px solid ${itemMeta.border}`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {itemMeta.label}
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                      {p.price != null ? (
                        <span style={{ fontWeight: 700, color: '#15803d' }}>
                          {p.currency || 'USD'} {Number(p.price).toLocaleString()}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          border: `2px solid ${isSelected ? itemMeta.color : '#cbd5e1'}`,
                          background: isSelected ? itemMeta.color : 'transparent',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {isSelected && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {filteredProducts.length > 0 && (
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, textAlign: 'right' }}>
          {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} shown
          {selectedProduct ? ' · 1 selected' : ' · click a row to select'}
        </div>
      )}
    </div>
  );
}

