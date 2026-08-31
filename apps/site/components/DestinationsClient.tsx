'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { DestinationPublic } from '@/lib/api';

const DESTINATION_FALLBACK_IMAGES: Record<string, string> = {
  ghana: 'https://sunseekerstours.com/wp-content/uploads/2025/11/Black-star-square.png',
  accra: 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?q=80&w=800&auto=format&fit=crop',
  kumasi: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?q=80&w=800&auto=format&fit=crop',
  ashanti: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?q=80&w=800&auto=format&fit=crop',
  dubai: 'https://sunseekerstours.com/wp-content/uploads/2026/07/images-2-1.jpg',
  namibia: 'https://sunseekerstours.com/wp-content/uploads/2026/07/Namibia.jpg',
  rwanda: 'https://sunseekerstours.com/wp-content/uploads/2026/07/Rwanda.webp',
  seychelles: 'https://sunseekerstours.com/wp-content/uploads/2026/04/images-1.jpg',
  singapore: 'https://sunseekerstours.com/wp-content/uploads/2026/07/Universal-Studios-Singapore.jpg',
  malaysia: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?q=80&w=800&auto=format&fit=crop',
  benin: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
  togo: 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?q=80&w=800&auto=format&fit=crop',
  senegal: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=800&auto=format&fit=crop',
  cairo: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?q=80&w=800&auto=format&fit=crop',
  egypt: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?q=80&w=800&auto=format&fit=crop',
  marrakech: 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?q=80&w=800&auto=format&fit=crop',
  morocco: 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?q=80&w=800&auto=format&fit=crop',
  'sao tome': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop',
  'south africa': 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?q=80&w=800&auto=format&fit=crop',
  tanzania: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=800&auto=format&fit=crop',
  zanzibar: 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?q=80&w=800&auto=format&fit=crop',
  kenya: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop',
};

function getDestinationImage(dest: DestinationPublic): string {
  if (dest.coverImage && dest.coverImage.trim() !== '') {
    return dest.coverImage;
  }
  const nameLower = (dest.name || '').toLowerCase();
  const countryLower = (dest.country || '').toLowerCase();
  const slugLower = (dest.slug || '').toLowerCase();

  for (const [key, url] of Object.entries(DESTINATION_FALLBACK_IMAGES)) {
    if (nameLower.includes(key) || countryLower.includes(key) || slugLower.includes(key)) {
      return url;
    }
  }

  return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=800&auto=format&fit=crop';
}

function getFlagEmoji(country: string): string {
  const c = (country || '').toLowerCase();
  if (c.includes('ghana')) return '🇬🇭';
  if (c.includes('emirates') || c.includes('dubai') || c.includes('uae')) return '🇦🇪';
  if (c.includes('namibia')) return '🇳🇦';
  if (c.includes('rwanda')) return '🇷🇼';
  if (c.includes('seychelles')) return '🇸🇨';
  if (c.includes('singapore')) return '🇸🇬';
  if (c.includes('malaysia')) return '🇲🇾';
  if (c.includes('benin')) return '🇧🇯';
  if (c.includes('togo')) return '🇹🇬';
  if (c.includes('senegal')) return '🇸🇳';
  if (c.includes('egypt')) return '🇪🇬';
  if (c.includes('morocco')) return '🇲🇦';
  if (c.includes('sao tome')) return '🇸🇹';
  if (c.includes('south africa')) return '🇿🇦';
  if (c.includes('tanzania')) return '🇹🇿';
  if (c.includes('kenya')) return '🇰🇪';
  return '🌍';
}

export default function DestinationsClient({
  destinations,
  error,
}: {
  destinations: DestinationPublic[];
  error?: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'ghana' | 'africa' | 'international'>('all');

  const filteredDestinations = useMemo(() => {
    return destinations.filter((dest) => {
      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dest.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (dest.summary && dest.summary.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Category filter
      if (selectedFilter === 'all') return true;
      const c = (dest.country || '').toLowerCase();
      const n = (dest.name || '').toLowerCase();
      if (selectedFilter === 'ghana') {
        return c.includes('ghana') || n.includes('ghana') || n.includes('accra') || n.includes('kumasi');
      }
      if (selectedFilter === 'africa') {
        return (
          c.includes('benin') ||
          c.includes('togo') ||
          c.includes('senegal') ||
          c.includes('rwanda') ||
          c.includes('namibia') ||
          c.includes('south africa') ||
          c.includes('tanzania') ||
          c.includes('sao tome') ||
          c.includes('kenya') ||
          c.includes('morocco') ||
          c.includes('egypt')
        );
      }
      if (selectedFilter === 'international') {
        return (
          c.includes('emirates') ||
          c.includes('dubai') ||
          c.includes('uae') ||
          c.includes('singapore') ||
          c.includes('malaysia') ||
          c.includes('seychelles')
        );
      }
      return true;
    });
  }, [destinations, searchQuery, selectedFilter]);

  return (
    <>
      {/* 1. Destinations Page Hero Header */}
      <section className="destinations-hero-banner">
        <div className="container">
          <div className="destinations-hero-content">
            <span className="destinations-eyebrow">WORLDWIDE DESTINATIONS</span>
            <h1 className="destinations-hero-title">Explore Our Handcrafted Destinations</h1>
            <p className="destinations-hero-sub">
              From rich West African cultural kingdoms to exotic global capitals, serene savannahs and tropical islands.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Main Content Container */}
      <section className="section" style={{ background: '#f8fafc', minHeight: '600px' }}>
        <div className="container">
          {/* Controls Bar: Search & Region Filter Pills */}
          <div className="destinations-controls-bar">
            {/* Search Input */}
            <div className="destinations-search-box">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
              </svg>
              <input
                type="text"
                placeholder="Search by country, city or attraction..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="dest-search-input"
              />
              {searchQuery && (
                <button
                  className="dest-search-clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear Search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="dest-filter-pills">
              <button
                className={`dest-filter-pill ${selectedFilter === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('all')}
              >
                All Destinations ({destinations.length})
              </button>
              <button
                className={`dest-filter-pill ${selectedFilter === 'ghana' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('ghana')}
              >
                🇬🇭 Tour Ghana
              </button>
              <button
                className={`dest-filter-pill ${selectedFilter === 'africa' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('africa')}
              >
                🌍 Africa Safaris &amp; Heritage
              </button>
              <button
                className={`dest-filter-pill ${selectedFilter === 'international' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('international')}
              >
                ✈️ Global &amp; Island Trips
              </button>
            </div>
          </div>

          {/* Destination Cards Grid */}
          {filteredDestinations.length > 0 ? (
            <div className="destinations-grid">
              {filteredDestinations.map((dest) => {
                const imageUrl = getDestinationImage(dest);
                const flag = getFlagEmoji(dest.country);
                const tourCount = typeof dest._count?.tours === 'number' ? dest._count.tours : null;

                return (
                  <div key={dest.id || dest.slug} className="destination-modern-card">
                    {/* Top Image Box */}
                    <div className="dest-card-img-wrap">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt={dest.name}
                        loading="lazy"
                        className="dest-card-img"
                      />
                      <div className="dest-img-gradient-overlay" />

                      {/* Top Country Badge */}
                      <div className="dest-country-badge">
                        <span>{flag}</span>
                        <span>{dest.country}</span>
                      </div>

                      {/* Tour Count Chip */}
                      {tourCount !== null && tourCount > 0 && (
                        <div className="dest-tour-count-chip">
                          {tourCount} Tour{tourCount === 1 ? '' : 's'}
                        </div>
                      )}
                    </div>

                    {/* Body Content */}
                    <div className="dest-card-body">
                      <div className="dest-card-header">
                        <h3 className="dest-card-title">{dest.name}</h3>
                        {dest.region && <span className="dest-card-region">{dest.region}</span>}
                      </div>

                      <p className="dest-card-summary">
                        {dest.summary || `Experience the rich beauty, authentic culture and unforgettable landmarks of ${dest.name}.`}
                      </p>

                      {/* Action Button Link */}
                      <div className="dest-card-footer">
                        <Link
                          href={`/tours?destination=${encodeURIComponent(dest.name)}`}
                          className="btn-dest-explore"
                        >
                          <span>Explore Tours</span>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="destinations-empty-panel">
              <div className="empty-globe-icon">🌍</div>
              <h3>No destinations matched your filter</h3>
              <p>Try searching for a different destination, or reset your filters.</p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedFilter('all');
                }}
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
