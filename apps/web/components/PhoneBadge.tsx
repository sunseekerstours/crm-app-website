'use client';

import React from 'react';
import { parsePhoneNumber, PhoneInfo } from '@/lib/phone';

export interface PhoneBadgeProps {
  phone?: string | null;
  countryHint?: string | null;
  defaultCountry?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showWhatsApp?: boolean;
  showCall?: boolean;
  compact?: boolean;
  style?: React.CSSProperties;
}

export function PhoneBadge({
  phone,
  countryHint,
  defaultCountry,
  size,
  showWhatsApp = true,
  showCall = true,
  compact = false,
  style,
}: PhoneBadgeProps) {
  if (!phone) return null;

  const hint = countryHint || defaultCountry;
  const isCompact = compact || size === 'sm';
  const info: PhoneInfo = parsePhoneNumber(phone, hint);
  if (!info.formatted) return null;

  const isGh = info.isGhana;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: compact ? '2px 6px' : '3px 8px',
        borderRadius: '8px',
        background: isGh ? '#f0fdf4' : '#f8fafc',
        border: `1px solid ${isGh ? '#bbf7d0' : '#e2e8f0'}`,
        fontSize: compact ? '11px' : '12px',
        lineHeight: 1.2,
        maxWidth: '100%',
        ...style,
      }}
      title={`${info.countryName || 'Contact'} (${info.countryCode || 'Intl'}): ${info.formatted}`}
    >
      {/* Flag / Country Indicator */}
      <span
        style={{
          fontSize: compact ? '12px' : '13px',
          userSelect: 'none',
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        {info.flag}
      </span>

      {/* Country Tag / Pill */}
      {isGh ? (
        <span
          style={{
            fontSize: '10px',
            fontWeight: 800,
            color: '#166534',
            background: '#dcfce7',
            padding: '1px 4px',
            borderRadius: '4px',
            letterSpacing: '0.3px',
          }}
        >
          GH
        </span>
      ) : info.countryCode ? (
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            color: '#475569',
            background: '#f1f5f9',
            padding: '1px 4px',
            borderRadius: '4px',
          }}
        >
          {info.countryCode}
        </span>
      ) : null}

      {/* Clickable Phone Number */}
      <a
        href={info.telUrl}
        style={{
          color: isGh ? '#15803d' : '#1e293b',
          fontWeight: 700,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
        title={`Click to call ${info.formatted}`}
      >
        {info.formatted}
      </a>

      {/* Quick WhatsApp Action Button */}
      {showWhatsApp && info.whatsAppUrl && (
        <a
          href={info.whatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: compact ? '16px' : '18px',
            height: compact ? '16px' : '18px',
            borderRadius: '50%',
            background: '#25D366',
            color: '#ffffff',
            fontSize: compact ? '10px' : '11px',
            textDecoration: 'none',
            flexShrink: 0,
            marginLeft: '2px',
          }}
          title={`Open WhatsApp chat with ${info.formatted}`}
          onClick={(e) => e.stopPropagation()}
        >
          💬
        </a>
      )}

      {/* Quick Call Action Button */}
      {showCall && (
        <a
          href={info.telUrl}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: compact ? '16px' : '18px',
            height: compact ? '16px' : '18px',
            borderRadius: '50%',
            background: isGh ? '#166534' : '#0284c7',
            color: '#ffffff',
            fontSize: compact ? '9px' : '10px',
            textDecoration: 'none',
            flexShrink: 0,
          }}
          title={`Call ${info.formatted}`}
          onClick={(e) => e.stopPropagation()}
        >
          📞
        </a>
      )}
    </div>
  );
}

export default PhoneBadge;
