'use client';

import { useState, useEffect } from 'react';

export interface HeroSlideItem {
  image: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
}

export default function PageHeroSlider({
  slides,
  defaultTitle,
  defaultSubtitle,
  defaultEyebrow,
  height = '380px',
}: {
  slides: (string | HeroSlideItem)[];
  defaultTitle?: string;
  defaultSubtitle?: string;
  defaultEyebrow?: string;
  height?: string;
}) {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Normalize slides
  const normalizedSlides: HeroSlideItem[] = slides.map((s) => {
    if (typeof s === 'string') {
      return {
        image: s,
        eyebrow: defaultEyebrow,
        title: defaultTitle,
        subtitle: defaultSubtitle,
      };
    }
    return {
      image: s.image,
      eyebrow: s.eyebrow || defaultEyebrow,
      title: s.title || defaultTitle,
      subtitle: s.subtitle || defaultSubtitle,
    };
  });

  // Auto-transition slides every 4.5 seconds continuously
  useEffect(() => {
    if (normalizedSlides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % normalizedSlides.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [normalizedSlides.length]);

  return (
    <section className="page-hero-slider-wrap" style={{ height }}>
      {normalizedSlides.map((slide, idx) => (
        <div
          key={idx}
          className={`page-hero-slide-item ${idx === currentSlide ? 'active' : ''}`}
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.42), rgba(0, 0, 0, 0.68)), url('${slide.image}')`,
          }}
        >
          <div className="container" style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
            <div className="page-hero-text-box">
              {slide.eyebrow && (
                <div className="page-hero-eyebrow-badge">
                  {slide.eyebrow}
                </div>
              )}
              {slide.title && <h1 className="page-hero-heading">{slide.title}</h1>}
              {slide.subtitle && <p className="page-hero-subheading">{slide.subtitle}</p>}
            </div>
          </div>
        </div>
      ))}

      {/* Slide Navigation Arrows */}
      {normalizedSlides.length > 1 && (
        <>
          <button
            className="page-hero-arrow prev"
            onClick={() => setCurrentSlide((prev) => (prev - 1 + normalizedSlides.length) % normalizedSlides.length)}
            aria-label="Previous image"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            className="page-hero-arrow next"
            onClick={() => setCurrentSlide((prev) => (prev + 1) % normalizedSlides.length)}
            aria-label="Next image"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>

          {/* Dot Indicators */}
          <div className="page-hero-dots">
            {normalizedSlides.map((_, i) => (
              <button
                key={i}
                className={`page-hero-dot ${i === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(i)}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
