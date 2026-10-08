'use client';

import React, { useState, useEffect, useRef } from 'react';
import QRCodeStyling, {
  DotType,
  CornerDotType,
  CornerSquareType,
} from 'qr-code-styling';
import { api } from '@/lib/api';

// ── SVG Logo Presets (Data URLs with Base64 encoding for 100% browser compatibility) ──
const SVG_PRESETS = {
  sunseekers: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNDAgMjQwIiB3aWR0aD0iMjQwIiBoZWlnaHQ9IjI0MCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJzdW5HbG93IiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjRkZCMzAwIi8+PHN0b3Agb2Zmc2V0PSI1MCUiIHN0b3AtY29sb3I9IiNGNTdDMDAiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNEODQzMTUiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48Y2lyY2xlIGN4PSIxMjAiIGN5PSIxMjAiIHI9IjExNCIgZmlsbD0idXJsKCNzdW5HbG93KSIvPjxjaXJjbGUgY3g9IjEyMCIgY3k9IjEyMCIgcj0iODUiIGZpbGw9IiNGRkZGRkYiIG9wYWNpdHk9IjAuMTUiLz48cGF0aCBkPSJNMTIwIDQwIEwxMjYgNjUgTDE1MSA1NSBMMTQzIDc4IEwxNjggODMgTDE0OSA5OSBMMTY4IDExNiBMMTQzIDEyMCBMMTUxIDE0MyBMMTI2IDEzMyBMMTIwIDE1OCBMMTE0IDEzMyBMODkgMTQzIEw5NyAxMjAgTDcyIDExNiBMOTEgOTkgTDcyIDgzIEw5NyA3OCBMODkgNTUgTDExNCA2NSBaIiBmaWxsPSIjRkZGRkZGIiBvcGFjaXR5PSIwLjkiLz48Y2lyY2xlIGN4PSIxMjAiIGN5PSIxMDAiIHI9IjMwIiBmaWxsPSIjRkZGRkZGIi8+PGNpcmNsZSBjeD0iMTIwIiBjeT0iMTAwIiByPSIyMiIgZmlsbD0iI0Q4NDMxNSIvPjx0ZXh0IHg9IjEyMCIgeT0iMTk1IiBmb250LWZhbWlseT0iQXJpYWwsc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjkwMCIgZm9udC1zaXplPSIyMCIgZmlsbD0iI0ZGRkZGRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgbGV0dGVyLXNwYWNpbmc9IjMiPlNVTlNFRUtFUlM8L3RleHQ+PC9zdmc+',
  bus: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNDAgMjQwIiB3aWR0aD0iMjQwIiBoZWlnaHQ9IjI0MCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJidXNHcmFkIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMDI4NEM3Ii8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMDM2OUExIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PGNpcmNsZSBjeD0iMTIwIiBjeT0iMTIwIiByPSIxMTQiIGZpbGw9InVybCgjYnVzR3JhZCkiLz48cmVjdCB4PSI2MCIgeT0iNTUiIHdpZHRoPSIxMjAiIGhlaWdodD0iMTA1IiByeD0iMjAiIGZpbGw9IiNGRkZGRkYiLz48cmVjdCB4PSI3MCIgeT0iNjUiIHdpZHRoPSIxMDAiIGhlaWdodD0iNDIiIHJ4PSI4IiBmaWxsPSIjMEM0QTZFIi8+PHJlY3QgeD0iNzIiIHk9IjExNSIgd2lkdGg9IjIyIiBoZWlnaHQ9IjE0IiByeD0iNCIgZmlsbD0iI0ZGQjMwMCIvPjxyZWN0IHg9IjE0NiIgeT0iMTE1IiB3aWR0aD0iMjIiIGhlaWdodD0iMTQiIHJ4PSI0IiBmaWxsPSIjRkZCMzAwIi8+PHJlY3QgeD0iMTAwIiB5PSIxMjAiIHdpZHRoPSI0MCIgaGVpZ2h0PSI4IiByeD0iMiIgZmlsbD0iIzY0NzQ4QiIvPjxjaXJjbGUgY3g9Ijg1IiBjeT0iMTcyIiByPSIxNCIgZmlsbD0iIzBGMTcyQSIvPjxjaXJjbGUgY3g9Ijg1IiBjeT0iMTcyIiByPSI2IiBmaWxsPSIjQ0JENUUxIi8+PGNpcmNsZSBjeD0iMTU1IiBjeT0iMTcyIiByPSIxNCIgZmlsbD0iIzBGMTcyQSIvPjxjaXJjbGUgY3g9IjE1NSIgY3k9IjE3MiIgcj0iNiIgZmlsbD0iI0NCRDVFMSIvPjx0ZXh0IHg9IjEyMCIgeT0iMjEwIiBmb250LWZhbWlseT0iQXJpYWwsc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjgwMCIgZm9udC1zaXplPSIxNiIgZmlsbD0iI0ZGRkZGRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgbGV0dGVyLXNwYWNpbmc9IjIiPkZMRUVUIENPQUNIPC90ZXh0Pjwvc3ZnPg==',
  sun: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNDAgMjQwIiB3aWR0aD0iMjQwIiBoZWlnaHQ9IjI0MCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJiYWRnZUdyYWQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNEOTc3MDYiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiM3ODM1MEYiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48Y2lyY2xlIGN4PSIxMjAiIGN5PSIxMjAiIHI9IjExNCIgZmlsbD0idXJsKCNiYWRnZUdyYWQpIi8+PGNpcmNsZSBjeD0iMTIwIiBjeT0iMTIwIiByPSI2NSIgZmlsbD0iI0ZFRjNDNyIvPjxjaXJjbGUgY3g9IjEyMCIgY3k9IjEyMCIgcj0iNDgiIGZpbGw9IiNGNTlFMEIiLz48Y2lyY2xlIGN4PSIxMjAiIGN5PSIxMjAiIHI9IjMwIiBmaWxsPSIjQjQ1MzA5Ii8+PHRleHQgeD0iMTIwIiB5PSIyMTAiIGZvbnQtZmFtaWx5PSJBcmlhbCxzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iODAwIiBmb250LXNpemU9IjE2IiBmaWxsPSIjRkZGRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBsZXR0ZXItc3BhY2luZz0iMiI+U1VOIEJBREdFPC90ZXh0Pjwvc3ZnPg==',
  ticket: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNDAgMjQwIiB3aWR0aD0iMjQwIiBoZWlnaHQ9IjI0MCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJ0aWNrZXRHcmFkIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMDU5NjY5Ii8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMDY0RTNCIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PGNpcmNsZSBjeD0iMTIwIiBjeT0iMTIwIiByPSIxMTQiIGZpbGw9InVybCgjdGlja2V0R3JhZCkiLz48cmVjdCB4PSI1NSIgeT0iNzUiIHdpZHRoPSIxMzAiIGhlaWdodD0iOTAiIHJ4PSIxMiIgZmlsbD0iI0ZGRkZGRiIvPjxjaXJjbGUgY3g9IjU1IiBjeT0iMTIwIiByPSIxNCIgZmlsbD0iIzA2NEUzQiIvPjxjaXJjbGUgY3g9IjE4NSIgY3k9IjEyMCIgcj0iMTQiIGZpbGw9IiMwNjRFM0IiLz48bGluZSB4MT0iMTIwIiB5MT0iODUiIHgyPSIxMjAiIHkyPSIxNTUiIHN0cm9rZT0iI0NCRDVFMSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtZGFzaGFycmF5PSI2IDQiLz48dGV4dCB4OCIgeT0iMTI1IiBmb250LWZhbWlseT0iQXJpYWwsc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjgwMCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzA1OTY2OSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+UEFTUzwvdGV4dD48dGV4dCB4PSIxNTIiIHk9IjEyNSIgZm9udC1mYW1pbHk9IkFyaWFsLHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI4MDAiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiMwNTk2NjkiIHRleHQtYW5jaG9yPSJtaWRkbGUiPjIwMjY8L3RleHQ+PHRleHQgeD0iMTIwIiB5PSIyMTAiIGZvbnQtZmFtaWx5PSJBcmlhbCxzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iODAwIiBmb250LXNpemU9IjE2IiBmaWxsPSIjRkZGRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBsZXR0ZXItc3BhY2luZz0iMiI+VElDS0VUIFBBU1M8L3RleHQ+PC9zdmc+',
};

// ── Theme Palettes ───────────────────────────────────────────────────────────
const THEMES: Record<string, {
  name: string;
  mode: 'linear' | 'radial' | 'solid';
  angle: number;
  primary: string;
  secondary: string;
  bg: string;
  customEyes: boolean;
  eyeFrame: string;
  eyeDot: string;
  frameBg: string;
  frameText: string;
}> = {
  sunset: {
    name: 'Sunset Gold',
    mode: 'linear',
    angle: 45,
    primary: '#F57C00',
    secondary: '#D84315',
    bg: '#FFFFFF',
    customEyes: true,
    eyeFrame: '#BF360C',
    eyeDot: '#F57C00',
    frameBg: '#F57C00',
    frameText: '#FFFFFF',
  },
  ocean: {
    name: 'Coastal Blue',
    mode: 'linear',
    angle: 135,
    primary: '#0284C7',
    secondary: '#0369A1',
    bg: '#FFFFFF',
    customEyes: true,
    eyeFrame: '#0C4A6E',
    eyeDot: '#0284C7',
    frameBg: '#0284C7',
    frameText: '#FFFFFF',
  },
  onyx: {
    name: 'Midnight Onyx',
    mode: 'linear',
    angle: 45,
    primary: '#0F172A',
    secondary: '#334155',
    bg: '#FFFFFF',
    customEyes: true,
    eyeFrame: '#020617',
    eyeDot: '#D97706',
    frameBg: '#0F172A',
    frameText: '#F8FAFC',
  },
  safari: {
    name: 'Safari Amber',
    mode: 'linear',
    angle: 90,
    primary: '#D97706',
    secondary: '#78350F',
    bg: '#FFFFFF',
    customEyes: true,
    eyeFrame: '#451A03',
    eyeDot: '#D97706',
    frameBg: '#B45309',
    frameText: '#FFFFFF',
  },
  emerald: {
    name: 'Forest Express',
    mode: 'linear',
    angle: 45,
    primary: '#059669',
    secondary: '#064E3B',
    bg: '#FFFFFF',
    customEyes: true,
    eyeFrame: '#064E3B',
    eyeDot: '#10B981',
    frameBg: '#059669',
    frameText: '#FFFFFF',
  },
  custom: {
    name: 'Custom Palette',
    mode: 'linear',
    angle: 45,
    primary: '#EC4899',
    secondary: '#8B5CF6',
    bg: '#FFFFFF',
    customEyes: false,
    eyeFrame: '#8B5CF6',
    eyeDot: '#EC4899',
    frameBg: '#8B5CF6',
    frameText: '#FFFFFF',
  },
};

const DEFAULT_CATEGORIES = [
  'Fleet & Buses',
  'Tours',
  'Tickets & Booking',
  'Passenger Wi-Fi',
  'Customer Feedback',
  'VIP Lounges',
  'Social & Marketing',
];

interface QrItem {
  id: string;
  name: string;
  category: string;
  url: string;
  subtitle: string;
  createdAt: string;
  configSnapshot: any;
}

export function QrCodeStudio({ titlePrefix = 'Admin' }: { titlePrefix?: string }) {
  const [activeTab, setActiveTab] = useState<'studio' | 'library'>('studio');

  // ── Config State ──────────────────────────────────────────────────────────
  const [qrName, setQrName] = useState('Sunseekers Express Booking');
  const [category, setCategory] = useState('Fleet & Buses');
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [newCatInput, setNewCatInput] = useState('');
  const [showCatModal, setShowCatModal] = useState(false);

  const [dataType, setDataType] = useState<'url' | 'wifi' | 'whatsapp' | 'vcard' | 'text' | 'phone' | 'email' | 'maps'>('url');
  const [subtitle, setSubtitle] = useState('Point camera to view timetable & book seats');

  // Input states
  const [rawUrl, setRawUrl] = useState('https://sunseekers.co.za/book-tickets');
  const [wifiSsid, setWifiSsid] = useState('Sunseekers-Fleet-Guest');
  const [wifiPass, setWifiPass] = useState('SeekTheSun2026');
  const [wifiEnc, setWifiEnc] = useState('WPA');
  const [waPhone, setWaPhone] = useState('+233541234567');
  const [waMsg, setWaMsg] = useState('Hello Sunseekers, I would like to inquire about bus and tour bookings.');
  const [vcardName, setVcardName] = useState('Sunseekers Travel Operations');
  const [vcardPhone, setVcardPhone] = useState('+233 30 200 0000');
  const [vcardEmail, setVcardEmail] = useState('info@sunseekerstravel.com');
  const [vcardOrg, setVcardOrg] = useState('Fleet & Customer Logistics');
  const [plainText, setPlainText] = useState('Welcome onboard Sunseekers Luxury Travel!');
  const [phoneVal, setPhoneVal] = useState('+233302000000');
  const [emailVal, setEmailVal] = useState('info@sunseekerstravel.com');
  const [mapsVal, setMapsVal] = useState('Sunseekers Terminal, Accra, Ghana');

  // Pattern and Shapes
  const [dotsType, setDotsType] = useState<DotType>('rounded');
  const [cornersSquareType, setCornersSquareType] = useState<CornerSquareType>('extra-rounded');
  const [cornersDotType, setCornersDotType] = useState<CornerDotType>('dot');

  // Colors & Gradients
  const [selectedTheme, setSelectedTheme] = useState('sunset');
  const [colorMode, setColorMode] = useState<'linear' | 'radial' | 'solid'>('linear');
  const [gradientAngle, setGradientAngle] = useState(45);
  const [primaryColor, setPrimaryColor] = useState('#F57C00');
  const [secondaryColor, setSecondaryColor] = useState('#D84315');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [transparentBg, setTransparentBg] = useState(false);
  const [customEyes, setCustomEyes] = useState(true);
  const [eyeFrameColor, setEyeFrameColor] = useState('#BF360C');
  const [eyeDotColor, setEyeDotColor] = useState('#F57C00');

  // Logo & Insignia
  const [logoPreset, setLogoPreset] = useState<string>('sunseekers');
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(null);
  const [customLogoName, setCustomLogoName] = useState<string>('');
  const [logoSize, setLogoSize] = useState(0.30);
  const [logoMargin, setLogoMargin] = useState(3);
  const [hideBackgroundDots, setHideBackgroundDots] = useState(true);

  // Frame Banner
  const [frameStyle, setFrameStyle] = useState<'none' | 'bottom-banner' | 'top-badge' | 'full-card'>('bottom-banner');
  const [frameText, setFrameText] = useState('SCAN TO BOOK');
  const [frameBgColor, setFrameBgColor] = useState('#F57C00');
  const [frameTextColor, setFrameTextColor] = useState('#FFFFFF');

  // Export & Library
  const [exportSize, setExportSize] = useState(1200);
  const [library, setLibrary] = useState<QrItem[]>([]);
  const [libFilter, setLibFilter] = useState('all');
  const [libSearch, setLibSearch] = useState('');
  const [activeWorkingId, setActiveWorkingId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('syncing');

  // Print Dialog
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printLayout, setPrintLayout] = useState<'stand' | 'sticker' | 'single'>('stand');
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Canvas Refs
  const previewCanvasRef = useRef<HTMLDivElement>(null);
  const qrCodeInstanceRef = useRef<QRCodeStyling | null>(null);

  function triggerToast(text: string, type: 'success' | 'info' | 'error' = 'success') {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  }

  // ── Load Stored Library ────────────────────────────────────────────────────
  useEffect(() => {
    // 1. Instant local cache load
    try {
      const saved = localStorage.getItem('sunseekers_qr_library_v2');
      if (saved) {
        setLibrary(JSON.parse(saved));
      }
      const savedCats = localStorage.getItem('sunseekers_categories_v1');
      if (savedCats) {
        setCategories(JSON.parse(savedCats));
      }
    } catch (e) {}

    // 2. Global fetch from backend PostgreSQL database
    setSyncStatus('syncing');
    api.get<{ items: QrItem[]; categories?: string[] }>('/qr-library')
      .then((data) => {
        if (data && Array.isArray(data.items)) {
          setLibrary(data.items);
          try {
            localStorage.setItem('sunseekers_qr_library_v2', JSON.stringify(data.items));
          } catch {}
        }
        if (data && Array.isArray(data.categories) && data.categories.length > 0) {
          setCategories(data.categories);
          try {
            localStorage.setItem('sunseekers_categories_v1', JSON.stringify(data.categories));
          } catch {}
        }
        setSyncStatus('synced');
      })
      .catch((err) => {
        console.warn('Could not load global QR library from server, using local cache:', err);
        setSyncStatus('offline');
      });
  }, []);

  function saveLibrary(items: QrItem[], newCats?: string[]) {
    setLibrary(items);
    const catsToSave = newCats || categories;
    try {
      localStorage.setItem('sunseekers_qr_library_v2', JSON.stringify(items));
      if (newCats) {
        localStorage.setItem('sunseekers_categories_v1', JSON.stringify(newCats));
      }
    } catch (e) {}

    // Global persistence to backend PostgreSQL database
    setSyncStatus('syncing');
    api.put('/qr-library', { items, categories: catsToSave })
      .then(() => {
        setSyncStatus('synced');
      })
      .catch((err) => {
        console.warn('Failed to sync QR library to server database:', err);
        setSyncStatus('offline');
      });
  }

  // ── Compute Payload String ─────────────────────────────────────────────────
  function getComputedData(): string {
    switch (dataType) {
      case 'url':
        return rawUrl.trim() || 'https://sunseekers.co.za';
      case 'wifi':
        return `WIFI:T:${wifiEnc};S:${wifiSsid};P:${wifiPass};;`;
      case 'whatsapp': {
        const cleanPhone = waPhone.replace(/[^0-9]/g, '');
        return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMsg)}`;
      }
      case 'vcard':
        return `BEGIN:VCARD\nVERSION:3.0\nFN:${vcardName}\nORG:${vcardOrg}\nTEL:${vcardPhone}\nEMAIL:${vcardEmail}\nEND:VCARD`;
      case 'text':
        return plainText;
      case 'phone':
        return `tel:${phoneVal.trim()}`;
      case 'email':
        return `mailto:${emailVal.trim()}?subject=Sunseekers%20Inquiry`;
      case 'maps':
        return `https://maps.google.com/?q=${encodeURIComponent(mapsVal)}`;
      default:
        return rawUrl;
    }
  }

  function getEffectiveLogo(): string | undefined {
    if (customLogoUrl) return customLogoUrl;
    if (logoPreset && logoPreset !== 'none' && SVG_PRESETS[logoPreset as keyof typeof SVG_PRESETS]) {
      return SVG_PRESETS[logoPreset as keyof typeof SVG_PRESETS];
    }
    return undefined;
  }

  // ── Build QR Code Styling Options ──────────────────────────────────────────
  function buildOptions(size: number = 280) {
    const dataString = getComputedData();
    const logo = getEffectiveLogo();

    const dotsOptions: any = {
      type: dotsType,
    };
    if (colorMode === 'solid') {
      dotsOptions.color = primaryColor;
    } else if (colorMode === 'linear') {
      dotsOptions.gradient = {
        type: 'linear',
        rotation: (gradientAngle * Math.PI) / 180,
        colorStops: [
          { offset: 0, color: primaryColor },
          { offset: 1, color: secondaryColor },
        ],
      };
    } else {
      dotsOptions.gradient = {
        type: 'radial',
        colorStops: [
          { offset: 0, color: primaryColor },
          { offset: 1, color: secondaryColor },
        ],
      };
    }

    const cornersSquareOptions: any = {
      type: cornersSquareType,
    };
    const cornersDotOptions: any = {
      type: cornersDotType,
    };

    if (customEyes) {
      cornersSquareOptions.color = eyeFrameColor;
      cornersDotOptions.color = eyeDotColor;
    } else if (dotsOptions.gradient) {
      cornersSquareOptions.gradient = dotsOptions.gradient;
      cornersDotOptions.gradient = dotsOptions.gradient;
    } else {
      cornersSquareOptions.color = primaryColor;
      cornersDotOptions.color = primaryColor;
    }

    return {
      width: size,
      height: size,
      data: dataString,
      margin: 12,
      qrOptions: {
        errorCorrectionLevel: 'Q' as const,
      },
      image: logo,
      imageOptions: {
        hideBackgroundDots: hideBackgroundDots,
        imageSize: logoSize,
        margin: logoMargin,
        crossOrigin: logo?.startsWith('data:') ? undefined : 'anonymous',
        saveAsBlob: false,
      },
      dotsOptions,
      cornersSquareOptions,
      cornersDotOptions,
      backgroundOptions: {
        color: transparentBg ? 'rgba(0,0,0,0)' : bgColor,
      },
    };
  }

  // ── Re-render QR Code on changes ───────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !previewCanvasRef.current || activeTab !== 'studio') return;

    const container = previewCanvasRef.current;
    try {
      const opts = {
        ...buildOptions(260),
        type: 'svg' as const,
      };

      container.innerHTML = '';
      const qrCode = new QRCodeStyling(opts);
      qrCodeInstanceRef.current = qrCode;
      qrCode.append(container);
    } catch (err) {
      console.error('Failed to render QR Code preview:', err);
    }
  }, [
    activeTab,
    dataType, rawUrl, wifiSsid, wifiPass, wifiEnc, waPhone, waMsg, vcardName, vcardPhone, vcardEmail, vcardOrg, plainText, phoneVal, emailVal, mapsVal,
    dotsType, cornersSquareType, cornersDotType,
    colorMode, gradientAngle, primaryColor, secondaryColor, bgColor, transparentBg,
    customEyes, eyeFrameColor, eyeDotColor,
    logoPreset, customLogoUrl, logoSize, logoMargin, hideBackgroundDots,
  ]);

  // ── Apply Palette Theme ────────────────────────────────────────────────────
  function applyTheme(key: string) {
    setSelectedTheme(key);
    const t = THEMES[key];
    if (!t) return;
    setColorMode(t.mode);
    setGradientAngle(t.angle);
    setPrimaryColor(t.primary);
    setSecondaryColor(t.secondary);
    setBgColor(t.bg);
    setCustomEyes(t.customEyes);
    setEyeFrameColor(t.eyeFrame);
    setEyeDotColor(t.eyeDot);
    setFrameBgColor(t.frameBg);
    setFrameTextColor(t.frameText);
  }

  // ── Handle Custom Logo Upload ──────────────────────────────────────────────
  function handleLogoFile(file: File) {
    if (!file.type.startsWith('image/')) {
      triggerToast('Please upload a valid image file (PNG, JPG, SVG, WebP)', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setCustomLogoUrl(result);
      setCustomLogoName(file.name);
      setLogoPreset('custom');
      triggerToast(`Logo "${file.name}" applied!`, 'success');
    };
    reader.readAsDataURL(file);
  }

  // ── Export Framed Canvas to PNG ────────────────────────────────────────────
  async function downloadPng() {
    try {
      const filename = `${qrName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Sunseekers_QR'}.png`;

      if (frameStyle === 'none') {
        const qr = new QRCodeStyling({ ...buildOptions(exportSize), type: 'canvas' });
        await qr.download({ name: filename.replace('.png', ''), extension: 'png' });
        triggerToast(`Downloaded ${filename}!`, 'success');
        return;
      }

      // Framed composite export
      const targetWidth = exportSize;
      const scale = targetWidth / 300;
      const padding = 24 * scale;
      const bannerHeight = 44 * scale;
      const cleanSub = subtitle ? subtitle.trim() : '';
      const footerHeight = cleanSub ? 28 * scale : 4 * scale;
      const qrInnerSize = targetWidth - padding * 2;

      let totalHeight = padding + qrInnerSize + padding;
      if (frameStyle === 'top-badge' || frameStyle === 'full-card') totalHeight += bannerHeight + 10 * scale;
      if (frameStyle === 'bottom-banner' || frameStyle === 'full-card') totalHeight += bannerHeight + 10 * scale;
      if (cleanSub) totalHeight += footerHeight;

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = totalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw Card Background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetWidth, totalHeight);

      let curY = padding;

      // Draw Top Banner
      if (frameStyle === 'top-badge' || frameStyle === 'full-card') {
        ctx.fillStyle = frameBgColor;
        ctx.beginPath();
        ctx.roundRect(padding, curY, qrInnerSize, bannerHeight, 10 * scale);
        ctx.fill();

        ctx.fillStyle = frameTextColor;
        ctx.font = `bold ${16 * scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(frameText.toUpperCase(), targetWidth / 2, curY + bannerHeight / 2);
        curY += bannerHeight + 10 * scale;
      }

      // Draw QR Canvas
      const tempDiv = document.createElement('div');
      const tempQr = new QRCodeStyling({ ...buildOptions(qrInnerSize), type: 'canvas' });
      tempQr.append(tempDiv);
      await new Promise((res) => setTimeout(res, 200));

      const qrCanvas = tempDiv.querySelector('canvas');
      if (qrCanvas) {
        ctx.drawImage(qrCanvas, padding, curY, qrInnerSize, qrInnerSize);
      }
      curY += qrInnerSize;

      // Draw Bottom Banner
      if (frameStyle === 'bottom-banner' || frameStyle === 'full-card') {
        curY += 10 * scale;
        ctx.fillStyle = frameBgColor;
        ctx.beginPath();
        ctx.roundRect(padding, curY, qrInnerSize, bannerHeight, 10 * scale);
        ctx.fill();

        ctx.fillStyle = frameTextColor;
        ctx.font = `bold ${16 * scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(frameText.toUpperCase(), targetWidth / 2, curY + bannerHeight / 2);
        curY += bannerHeight;
      }

      // Draw Public Instruction Subtitle (Only if provided)
      if (cleanSub) {
        curY += 8 * scale;
        ctx.fillStyle = '#64748B';
        ctx.font = `${11 * scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(cleanSub, targetWidth / 2, curY + 12 * scale);
      }

      // Trigger Download
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();

      triggerToast(`Downloaded ${filename} successfully!`, 'success');
    } catch (e: any) {
      triggerToast('Export error: ' + e.message, 'error');
    }
  }

  // ── Export SVG ─────────────────────────────────────────────────────────────
  async function downloadSvg() {
    try {
      const filename = qrName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Sunseekers_QR';
      const qr = new QRCodeStyling({ ...buildOptions(800), type: 'svg' });
      await qr.download({ name: filename, extension: 'svg' });
      triggerToast(`Downloaded ${filename}.svg vector!`, 'success');
    } catch (e: any) {
      triggerToast('SVG Export error: ' + e.message, 'error');
    }
  }

  // ── Reset Studio to Create a Brand New QR Code ──────────────────────────────
  function resetToNewQr() {
    setActiveWorkingId(null);
    setQrName('Sunseekers Express QR');
    setSubtitle('Point camera to scan & view details');
    setCategory(categories[0] || 'General');
    setDataType('url');
    setRawUrl('https://sunseekerstours.com');
    setWifiSsid('Sunseekers-Fleet-Guest');
    setWifiPass('');
    setWifiEnc('WPA');
    setWaPhone('+233541234567');
    setWaMsg('Hello Sunseekers, I would like to inquire about bookings.');
    setVcardName('Sunseekers Travel Operations');
    setVcardPhone('+233 30 200 0000');
    setVcardEmail('info@sunseekerstravel.com');
    setVcardOrg('Fleet & Customer Logistics');
    setPlainText('Welcome onboard Sunseekers Luxury Travel!');
    setSelectedTheme('sunset');
    setColorMode('linear');
    setGradientAngle(45);
    setPrimaryColor('#F57C00');
    setSecondaryColor('#D84315');
    setBgColor('#FFFFFF');
    setTransparentBg(false);
    setCustomEyes(true);
    setEyeFrameColor('#BF360C');
    setEyeDotColor('#F57C00');
    setLogoPreset('sunseekers');
    setCustomLogoUrl(null);
    setCustomLogoName('');
    setFrameStyle('bottom-banner');
    setFrameText('SCAN TO BOOK');
    setFrameBgColor('#F57C00');
    setFrameTextColor('#FFFFFF');
    setActiveTab('studio');
    triggerToast('✨ Studio ready: Create a brand new QR code!', 'info');
  }

  // ── Duplicate Item as New Copy ─────────────────────────────────────────────
  function duplicateItem(item: QrItem) {
    loadFromLibrary(item);
    setActiveWorkingId(null); // Key: clearing activeWorkingId ensures next save creates a new copy!
    setQrName(`${item.name} (Copy)`);
    triggerToast(`📑 Duplicated "${item.name}"! Edit and save as a new QR code.`, 'info');
  }

  // ── Save to Library ────────────────────────────────────────────────────────
  function saveToLibrary(saveAsNewCopy = false) {
    const isCreatingNew = saveAsNewCopy || !activeWorkingId;
    const finalId = isCreatingNew
      ? `qr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
      : activeWorkingId!;

    let finalName = qrName.trim() || 'Sunseekers QR';
    if (saveAsNewCopy && !finalName.endsWith('(Copy)') && library.some(i => i.id === activeWorkingId && i.name === finalName)) {
      finalName = `${finalName} (Copy)`;
      setQrName(finalName);
    }

    const item: QrItem = {
      id: finalId,
      name: finalName,
      category,
      url: getComputedData(),
      subtitle,
      createdAt: new Date().toISOString(),
      configSnapshot: {
        dataType, rawUrl, wifiSsid, wifiPass, wifiEnc, waPhone, waMsg, vcardName, vcardPhone, vcardEmail, vcardOrg, plainText, phoneVal, emailVal, mapsVal,
        dotsType, cornersSquareType, cornersDotType,
        colorMode, gradientAngle, primaryColor, secondaryColor, bgColor, transparentBg,
        customEyes, eyeFrameColor, eyeDotColor,
        logoPreset, customLogoUrl, logoSize, logoMargin, hideBackgroundDots,
        frameStyle, frameText, frameBgColor, frameTextColor,
      },
    };

    const existingIdx = library.findIndex((i) => i.id === item.id);
    let updated: QrItem[];
    if (existingIdx >= 0) {
      updated = [...library];
      updated[existingIdx] = item;
    } else {
      updated = [item, ...library];
    }

    setActiveWorkingId(item.id);
    saveLibrary(updated);
    triggerToast(
      isCreatingNew
        ? `Saved new QR code "${item.name}" to Global Library!`
        : `Updated "${item.name}" in Global Library!`,
      'success'
    );
  }

  // ── Load Item from Library ─────────────────────────────────────────────────
  function loadFromLibrary(item: QrItem) {
    setActiveWorkingId(item.id);
    setQrName(item.name);
    setCategory(item.category);
    setSubtitle(item.subtitle || '');

    const snap = item.configSnapshot;
    if (snap) {
      if (snap.dataType) setDataType(snap.dataType);
      if (snap.rawUrl) setRawUrl(snap.rawUrl);
      if (snap.wifiSsid) setWifiSsid(snap.wifiSsid);
      if (snap.wifiPass) setWifiPass(snap.wifiPass);
      if (snap.wifiEnc) setWifiEnc(snap.wifiEnc);
      if (snap.waPhone) setWaPhone(snap.waPhone);
      if (snap.waMsg) setWaMsg(snap.waMsg);
      if (snap.vcardName) setVcardName(snap.vcardName);
      if (snap.vcardPhone) setVcardPhone(snap.vcardPhone);
      if (snap.vcardEmail) setVcardEmail(snap.vcardEmail);
      if (snap.vcardOrg) setVcardOrg(snap.vcardOrg);
      if (snap.plainText) setPlainText(snap.plainText);
      if (snap.phoneVal) setPhoneVal(snap.phoneVal);
      if (snap.emailVal) setEmailVal(snap.emailVal);
      if (snap.mapsVal) setMapsVal(snap.mapsVal);

      if (snap.dotsType) setDotsType(snap.dotsType);
      if (snap.cornersSquareType) setCornersSquareType(snap.cornersSquareType);
      if (snap.cornersDotType) setCornersDotType(snap.cornersDotType);

      if (snap.colorMode) setColorMode(snap.colorMode);
      if (snap.gradientAngle !== undefined) setGradientAngle(snap.gradientAngle);
      if (snap.primaryColor) setPrimaryColor(snap.primaryColor);
      if (snap.secondaryColor) setSecondaryColor(snap.secondaryColor);
      if (snap.bgColor) setBgColor(snap.bgColor);
      if (snap.transparentBg !== undefined) setTransparentBg(snap.transparentBg);

      if (snap.customEyes !== undefined) setCustomEyes(snap.customEyes);
      if (snap.eyeFrameColor) setEyeFrameColor(snap.eyeFrameColor);
      if (snap.eyeDotColor) setEyeDotColor(snap.eyeDotColor);

      if (snap.logoPreset) setLogoPreset(snap.logoPreset);
      if (snap.customLogoUrl) setCustomLogoUrl(snap.customLogoUrl);
      if (snap.logoSize) setLogoSize(snap.logoSize);
      if (snap.logoMargin !== undefined) setLogoMargin(snap.logoMargin);
      if (snap.hideBackgroundDots !== undefined) setHideBackgroundDots(snap.hideBackgroundDots);

      if (snap.frameStyle) setFrameStyle(snap.frameStyle);
      if (snap.frameText) setFrameText(snap.frameText);
      if (snap.frameBgColor) setFrameBgColor(snap.frameBgColor);
      if (snap.frameTextColor) setFrameTextColor(snap.frameTextColor);
    }

    setActiveTab('studio');
    triggerToast(`Loaded "${item.name}" into Studio!`, 'info');
  }

  // ── Delete Item from Library ───────────────────────────────────────────────
  function deleteFromLibrary(id: string) {
    if (!confirm('Are you sure you want to delete this QR code?')) return;
    const updated = library.filter((i) => i.id !== id);
    if (activeWorkingId === id) setActiveWorkingId(null);
    saveLibrary(updated);
    triggerToast('QR Code deleted', 'info');
  }

  // ── Filtered Library Items ─────────────────────────────────────────────────
  const filteredLibrary = library.filter((item) => {
    const matchesCat = libFilter === 'all' || item.category === libFilter;
    const matchesSearch = !libSearch ||
      item.name.toLowerCase().includes(libSearch.toLowerCase()) ||
      item.url.toLowerCase().includes(libSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div style={{ minHeight: '100%', background: '#090d16', color: '#f1f5f9', padding: '24px' }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 24,
          zIndex: 9999,
          padding: '12px 20px',
          borderRadius: 8,
          background: toastMsg.type === 'error' ? '#ef4444' : toastMsg.type === 'info' ? '#0284c7' : '#16a34a',
          color: '#fff',
          fontWeight: 700,
          fontSize: 13,
          boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span>{toastMsg.type === 'error' ? '✕' : '✓'}</span>
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24,
        paddingBottom: 20,
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>📱</span>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                {titlePrefix} QR Code Studio
                <span style={{
                  marginLeft: 10,
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#000',
                  fontWeight: 800,
                  verticalAlign: 'middle',
                }}>
                  PRO HD
                </span>
                <span style={{
                  marginLeft: 8,
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 12,
                  background: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  color: '#4ade80',
                  fontWeight: 700,
                  verticalAlign: 'middle',
                }}>
                  ☁️ Global Cloud Synced
                </span>
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>
                Generate high-resolution custom branded QR codes for buses, tours, passenger Wi-Fi, tickets &amp; desk check-ins
              </p>
            </div>
          </div>
        </div>

        {/* Tab & Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: '#1e293b', padding: 4, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              type="button"
              onClick={() => setActiveTab('studio')}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                background: activeTab === 'studio' ? '#0284c7' : 'transparent',
                color: activeTab === 'studio' ? '#fff' : '#94a3b8',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Studio Creator
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('library')}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                background: activeTab === 'library' ? '#0284c7' : 'transparent',
                color: activeTab === 'library' ? '#fff' : '#94a3b8',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>Saved Library</span>
              <span style={{ background: '#0f172a', padding: '1px 6px', borderRadius: 10, fontSize: 10, color: '#38bdf8' }}>
                {library.length}
              </span>
            </button>
          </div>

          {/* Prominent Create New QR Button */}
          <button
            type="button"
            onClick={resetToNewQr}
            style={{
              padding: '7px 14px',
              borderRadius: 8,
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
            }}
            title="Start creating a new QR code from scratch"
          >
            <span>➕</span>
            <span>New QR Code</span>
          </button>

          {/* Sync Status Badge */}
          <div style={{
            padding: '6px 12px',
            borderRadius: 8,
            background: syncStatus === 'synced' ? 'rgba(34, 197, 94, 0.12)' : syncStatus === 'syncing' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(245, 158, 11, 0.12)',
            border: `1px solid ${syncStatus === 'synced' ? 'rgba(34, 197, 94, 0.3)' : syncStatus === 'syncing' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            color: syncStatus === 'synced' ? '#4ade80' : syncStatus === 'syncing' ? '#38bdf8' : '#fbbf24',
            fontSize: 11,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <span>{syncStatus === 'synced' ? '🟢' : syncStatus === 'syncing' ? '🔄' : '🟡'}</span>
            <span>{syncStatus === 'synced' ? 'Global Database Synced' : syncStatus === 'syncing' ? 'Syncing...' : 'Local Cache'}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.15)',
              background: '#1e293b',
              color: '#f8fafc',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>🖨️</span>
            <span>Print Stands</span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: STUDIO CREATOR ───────────────────────────────────────────── */}
      {activeTab === 'studio' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(340px, 1fr)', gap: 24, alignItems: 'start' }}>
          
          {/* Active Mode Banner */}
          {activeWorkingId ? (
            <div style={{
              gridColumn: '1 / -1',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 16px',
              borderRadius: 8,
              background: 'rgba(2, 132, 199, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: '#f8fafc',
              flexWrap: 'wrap',
              gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>✏️</span>
                <div>
                  <span style={{ fontSize: 12, color: '#38bdf8', fontWeight: 700 }}>EDITING SAVED CODE: </span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>"{qrName}"</span>
                  <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>({category})</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => saveToLibrary(true)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 6,
                    background: 'rgba(245, 158, 11, 0.2)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    color: '#fbbf24',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  title="Create an additional new QR code copy without changing this original"
                >
                  📑 Save as New Copy
                </button>
                <button
                  type="button"
                  onClick={resetToNewQr}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 6,
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ➕ Start Blank New QR
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              gridColumn: '1 / -1',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 16px',
              borderRadius: 8,
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              color: '#4ade80',
              flexWrap: 'wrap',
              gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>✨</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>
                  New QR Code Creation Mode — Once saved, this QR code will sync globally for all team members.
                </span>
              </div>
            </div>
          )}

          {/* Controls Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {/* Card 1: Content & Link */}
            <div style={{ background: '#131b2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 18, color: '#f59e0b' }}>1️⃣</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>Content &amp; Link Setup</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>Define the destination and identity of this QR code</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>
                    QR Code Internal Name / Reference * <span style={{ color: '#64748b', fontWeight: 400 }}>(CRM index only — not printed on QR)</span>
                  </label>
                  <input
                    type="text"
                    value={qrName}
                    onChange={(e) => setQrName(e.target.value)}
                    placeholder="e.g. Cape Town Express - Seat Booking"
                    style={{ width: '100%', padding: '9px 12px', background: '#090d16', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>Category</label>
                      <button
                        type="button"
                        onClick={() => setShowCatModal(true)}
                        style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                      >
                        + Manage
                      </button>
                    </div>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', background: '#090d16', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>
                      Data Type &amp; Action
                    </label>
                    <select
                      value={dataType}
                      onChange={(e) => setDataType(e.target.value as any)}
                      style={{ width: '100%', padding: '9px 12px', background: '#090d16', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                    >
                      <option value="url">Website / Link (URL)</option>
                      <option value="wifi">Bus Passenger Wi-Fi</option>
                      <option value="whatsapp">WhatsApp Booking Line</option>
                      <option value="vcard">Business Contact (vCard)</option>
                      <option value="text">Plain Text / Note</option>
                      <option value="phone">Direct Phone Call</option>
                      <option value="email">Email Dispatch</option>
                      <option value="maps">Google Maps Location</option>
                    </select>
                  </div>
                </div>

                {/* Conditional Inputs */}
                {dataType === 'url' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>
                      Destination Web URL
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="url"
                        value={rawUrl}
                        onChange={(e) => setRawUrl(e.target.value)}
                        placeholder="https://sunseekers.co.za/book"
                        style={{ flex: 1, padding: '9px 12px', background: '#090d16', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                      />
                      <button
                        type="button"
                        onClick={() => window.open(rawUrl, '_blank')}
                        style={{ padding: '0 14px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#38bdf8', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Test ↗
                      </button>
                    </div>

                    {/* Quick Presets */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                      <span style={{ fontSize: 11, color: '#64748b', alignSelf: 'center' }}>Presets:</span>
                      {[
                        { label: 'Online Booking', url: 'https://sunseekers.co.za/online-booking' },
                        { label: 'Live Fleet GPS', url: 'https://sunseekers.co.za/fleet-tracking' },
                        { label: 'Baggage Claim', url: 'https://sunseekers.co.za/luggage-claim' },
                        { label: 'Tour Catalog', url: 'https://sunseekers.co.za/tours' },
                      ].map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => setRawUrl(p.url)}
                          style={{
                            background: '#1e293b',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 4,
                            color: '#94a3b8',
                            fontSize: 10,
                            padding: '3px 8px',
                            cursor: 'pointer',
                          }}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {dataType === 'wifi' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 8 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Network SSID</label>
                      <input
                        type="text"
                        value={wifiSsid}
                        onChange={(e) => setWifiSsid(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', background: '#090d16', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Password</label>
                      <input
                        type="text"
                        value={wifiPass}
                        onChange={(e) => setWifiPass(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', background: '#090d16', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Security</label>
                      <select
                        value={wifiEnc}
                        onChange={(e) => setWifiEnc(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', background: '#090d16', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 12 }}
                      >
                        <option value="WPA">WPA/WPA2</option>
                        <option value="WEP">WEP</option>
                        <option value="nopass">Open</option>
                      </select>
                    </div>
                  </div>
                )}

                {dataType === 'whatsapp' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 8 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>WhatsApp Phone (with intl code)</label>
                      <input
                        type="text"
                        value={waPhone}
                        onChange={(e) => setWaPhone(e.target.value)}
                        placeholder="+233541234567"
                        style={{ width: '100%', padding: '7px 10px', background: '#090d16', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Pre-filled Chat Greeting</label>
                      <input
                        type="text"
                        value={waMsg}
                        onChange={(e) => setWaMsg(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', background: '#090d16', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 12 }}
                      />
                    </div>
                  </div>
                )}

                {dataType === 'vcard' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Contact Name</label>
                      <input
                        type="text"
                        value={vcardName}
                        onChange={(e) => setVcardName(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', background: '#090d16', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Department</label>
                      <input
                        type="text"
                        value={vcardOrg}
                        onChange={(e) => setVcardOrg(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', background: '#090d16', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Phone</label>
                      <input
                        type="text"
                        value={vcardPhone}
                        onChange={(e) => setVcardPhone(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', background: '#090d16', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Email</label>
                      <input
                        type="email"
                        value={vcardEmail}
                        onChange={(e) => setVcardEmail(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', background: '#090d16', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 12 }}
                      />
                    </div>
                  </div>
                )}

                {dataType === 'text' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Plain Text / Message</label>
                    <textarea
                      rows={3}
                      value={plainText}
                      onChange={(e) => setPlainText(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', background: '#090d16', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 12 }}
                    />
                  </div>
                )}

                {dataType === 'phone' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Phone Number to Dial</label>
                    <input
                      type="text"
                      value={phoneVal}
                      onChange={(e) => setPhoneVal(e.target.value)}
                      placeholder="+233 30 200 0000"
                      style={{ width: '100%', padding: '8px 12px', background: '#090d16', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 12 }}
                    />
                  </div>
                )}

                {dataType === 'email' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Destination Email Address</label>
                    <input
                      type="email"
                      value={emailVal}
                      onChange={(e) => setEmailVal(e.target.value)}
                      placeholder="info@sunseekers.co.za"
                      style={{ width: '100%', padding: '8px 12px', background: '#090d16', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 12 }}
                    />
                  </div>
                )}

                {dataType === 'maps' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Google Maps Place or Address</label>
                    <input
                      type="text"
                      value={mapsVal}
                      onChange={(e) => setMapsVal(e.target.value)}
                      placeholder="Sunseekers Terminal, Accra"
                      style={{ width: '100%', padding: '8px 12px', background: '#090d16', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 12 }}
                    />
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>
                    Display Subtitle / Instructions (Printed on stand)
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Point camera to view timetable & book seats"
                    style={{ width: '100%', padding: '9px 12px', background: '#090d16', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Patterns & Eye Shapes */}
            <div style={{ background: '#131b2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 18, color: '#f59e0b' }}>2️⃣</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>Pattern &amp; Corner Eye Shapes</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>Select styled dot matrix and corner marker geometry</p>
                </div>
              </div>

              {/* Dots Type Buttons */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
                  Body Dots Style
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                  {[
                    { id: 'dots', label: 'Dots' },
                    { id: 'rounded', label: 'Rounded' },
                    { id: 'classy', label: 'Classy' },
                    { id: 'classy-rounded', label: 'Classy+' },
                    { id: 'extra-rounded', label: 'Curved' },
                    { id: 'square', label: 'Square' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setDotsType(s.id as DotType)}
                      style={{
                        padding: '10px 4px',
                        borderRadius: 6,
                        border: dotsType === s.id ? '2px solid #0284c7' : '1px solid rgba(255,255,255,0.1)',
                        background: dotsType === s.id ? 'rgba(2, 132, 199, 0.2)' : '#090d16',
                        color: dotsType === s.id ? '#38bdf8' : '#94a3b8',
                        fontWeight: 700,
                        fontSize: 11,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Eye Shapes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>
                    Eye Outer Frame
                  </label>
                  <select
                    value={cornersSquareType}
                    onChange={(e) => setCornersSquareType(e.target.value as CornerSquareType)}
                    style={{ width: '100%', padding: '9px 12px', background: '#090d16', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  >
                    <option value="extra-rounded">Extra Rounded (Modern)</option>
                    <option value="dot">Circle / Dot</option>
                    <option value="square">Classic Square</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>
                    Eye Inner Center
                  </label>
                  <select
                    value={cornersDotType}
                    onChange={(e) => setCornersDotType(e.target.value as CornerDotType)}
                    style={{ width: '100%', padding: '9px 12px', background: '#090d16', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  >
                    <option value="dot">Circular Dot</option>
                    <option value="square">Square Dot</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Card 3: Brand Colors & Gradients */}
            <div style={{ background: '#131b2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 18, color: '#f59e0b' }}>3️⃣</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>Brand Palettes &amp; Colors</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>Apply official brand palettes or configure gradients</p>
                </div>
              </div>

              {/* Theme Presets */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
                  Quick Brand Palettes
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {Object.entries(THEMES).map(([k, t]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => applyTheme(k)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: selectedTheme === k ? '2px solid #0284c7' : '1px solid rgba(255,255,255,0.1)',
                        background: selectedTheme === k ? 'rgba(2, 132, 199, 0.15)' : '#090d16',
                        color: selectedTheme === k ? '#38bdf8' : '#e2e8f0',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${t.primary} 0%, ${t.secondary} 100%)`,
                        flexShrink: 0,
                      }} />
                      <span>{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Detailed Color Controls */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Color Style</label>
                  <select
                    value={colorMode}
                    onChange={(e) => setColorMode(e.target.value as any)}
                    style={{ width: '100%', padding: '8px 10px', background: '#090d16', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 12 }}
                  >
                    <option value="linear">Linear Gradient</option>
                    <option value="radial">Radial Gradient</option>
                    <option value="solid">Single Solid Color</option>
                  </select>
                </div>

                {colorMode === 'linear' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
                      Gradient Angle: {gradientAngle}°
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={gradientAngle}
                      onChange={(e) => setGradientAngle(Number(e.target.value))}
                      style={{ width: '100%', marginTop: 6 }}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Color 1 (Start)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => { setPrimaryColor(e.target.value); setSelectedTheme('custom'); }}
                      style={{ width: 36, height: 32, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'none' }}
                    />
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#cbd5e1' }}>{primaryColor.toUpperCase()}</span>
                  </div>
                </div>

                {colorMode !== 'solid' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Color 2 (End)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => { setSecondaryColor(e.target.value); setSelectedTheme('custom'); }}
                        style={{ width: 36, height: 32, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'none' }}
                      />
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#cbd5e1' }}>{secondaryColor.toUpperCase()}</span>
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Background</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => { setBgColor(e.target.value); setSelectedTheme('custom'); }}
                      disabled={transparentBg}
                      style={{ width: 36, height: 32, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'none', opacity: transparentBg ? 0.3 : 1 }}
                    />
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#cbd5e1' }}>{transparentBg ? 'TRANSP' : bgColor.toUpperCase()}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#cbd5e1', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={transparentBg}
                    onChange={(e) => setTransparentBg(e.target.checked)}
                  />
                  <span>Transparent background (ideal for overlaying on vehicle livery or print stands)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#cbd5e1', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={customEyes}
                    onChange={(e) => setCustomEyes(e.target.checked)}
                  />
                  <span>Customize corner eye colors independently</span>
                </label>

                {customEyes && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 6, paddingLeft: 22 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Eye Outer Frame Color</label>
                      <input
                        type="color"
                        value={eyeFrameColor}
                        onChange={(e) => setEyeFrameColor(e.target.value)}
                        style={{ width: 36, height: 30, border: 'none', cursor: 'pointer', background: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Eye Inner Dot Color</label>
                      <input
                        type="color"
                        value={eyeDotColor}
                        onChange={(e) => setEyeDotColor(e.target.value)}
                        style={{ width: 36, height: 30, border: 'none', cursor: 'pointer', background: 'none' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Card 4: Business Logo & Insignia */}
            <div style={{ background: '#131b2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 18, color: '#f59e0b' }}>4️⃣</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>Business Logo &amp; Insignia</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>Embed brand emblem with automatic contrast isolation</p>
                </div>
              </div>

              {/* Logo Presets */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
                  Sunseekers Brand Logo Presets
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                  {[
                    { id: 'sunseekers', label: 'Sunseekers', icon: '☀️' },
                    { id: 'bus', label: 'Fleet Bus', icon: '🚌' },
                    { id: 'sun', label: 'Sun Badge', icon: '🎖️' },
                    { id: 'ticket', label: 'Ticket Pass', icon: '🎫' },
                    { id: 'none', label: 'No Logo', icon: '✕' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setLogoPreset(p.id);
                        setCustomLogoUrl(null);
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                        padding: '10px 4px',
                        borderRadius: 6,
                        border: logoPreset === p.id && !customLogoUrl ? '2px solid #0284c7' : '1px solid rgba(255,255,255,0.1)',
                        background: logoPreset === p.id && !customLogoUrl ? 'rgba(2, 132, 199, 0.2)' : '#090d16',
                        color: logoPreset === p.id && !customLogoUrl ? '#38bdf8' : '#94a3b8',
                        fontSize: 10,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{p.icon}</span>
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Logo Upload */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>
                  Or Upload Business Logo (PNG, SVG, JPG)
                </label>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files?.[0]) handleLogoFile(e.dataTransfer.files[0]);
                  }}
                  style={{
                    border: '1.5px dashed rgba(255,255,255,0.15)',
                    borderRadius: 8,
                    padding: '16px',
                    textAlign: 'center',
                    background: '#090d16',
                    cursor: 'pointer',
                  }}
                  onClick={() => document.getElementById('qrAdminLogoFileInput')?.click()}
                >
                  <input
                    type="file"
                    id="qrAdminLogoFileInput"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleLogoFile(e.target.files[0]);
                    }}
                  />
                  <div style={{ fontSize: 20, marginBottom: 4 }}>📁</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9' }}>
                    {customLogoName ? `Selected: ${customLogoName}` : 'Click or Drag & Drop logo file'}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                    Transparent PNG or SVG recommended
                  </div>
                </div>

                {customLogoUrl && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>✓ Custom logo active</span>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomLogoUrl(null);
                        setCustomLogoName('');
                        setLogoPreset('sunseekers');
                      }}
                      style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 11, cursor: 'pointer', padding: 0 }}
                    >
                      ✕ Remove Custom Logo
                    </button>
                  </div>
                )}
              </div>

              {/* Logo Sizing & Clarity Controls */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>
                    Logo Size: {Math.round(logoSize * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.15"
                    max="0.38"
                    step="0.01"
                    value={logoSize}
                    onChange={(e) => setLogoSize(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>
                    Padding Margin: {logoMargin}px
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="12"
                    step="1"
                    value={logoMargin}
                    onChange={(e) => setLogoMargin(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#cbd5e1', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={hideBackgroundDots}
                  onChange={(e) => setHideBackgroundDots(e.target.checked)}
                />
                <span>Clear QR dots behind logo (Guarantees 100% scan reliability)</span>
              </label>
            </div>

            {/* Card 5: Call to Action Frame Banner */}
            <div style={{ background: '#131b2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 18, color: '#f59e0b' }}>5️⃣</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>Frame &amp; Call-to-Action Banner</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>Include prominent &quot;SCAN TO BOOK&quot; or &quot;SCAN ME&quot; banner card</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>
                    Frame Style
                  </label>
                  <select
                    value={frameStyle}
                    onChange={(e) => setFrameStyle(e.target.value as any)}
                    style={{ width: '100%', padding: '9px 12px', background: '#090d16', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  >
                    <option value="none">No Frame (Clean QR Code)</option>
                    <option value="bottom-banner">Bottom Action Banner (&quot;SCAN ME&quot;)</option>
                    <option value="top-badge">Top Badge Header</option>
                    <option value="full-card">Full Bus Stand Card (Top + Bottom)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>
                    Banner Text
                  </label>
                  <input
                    type="text"
                    value={frameText}
                    onChange={(e) => setFrameText(e.target.value.toUpperCase())}
                    placeholder="SCAN TO BOOK"
                    style={{ width: '100%', padding: '9px 12px', background: '#090d16', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Banner Background</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="color"
                      value={frameBgColor}
                      onChange={(e) => setFrameBgColor(e.target.value)}
                      style={{ width: 36, height: 30, border: 'none', cursor: 'pointer', background: 'none' }}
                    />
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#cbd5e1' }}>{frameBgColor.toUpperCase()}</span>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Banner Text Color</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="color"
                      value={frameTextColor}
                      onChange={(e) => setFrameTextColor(e.target.value)}
                      style={{ width: 36, height: 30, border: 'none', cursor: 'pointer', background: 'none' }}
                    />
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#cbd5e1' }}>{frameTextColor.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column / Sticky Live Preview Hub */}
          <div style={{ position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Live Card Container */}
            <div style={{
              background: '#131b2e',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 14,
              padding: 20,
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}>
              {/* Card Header Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', letterSpacing: 1 }}>LIVE STUDIO PREVIEW</span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 8px',
                  borderRadius: 12,
                  background: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  color: '#4ade80',
                  fontSize: 10,
                  fontWeight: 700,
                }}>
                  <span>✓</span>
                  <span>High Reliability (Level Q)</span>
                </div>
              </div>

              {/* Framed Display Preview Area */}
              <div style={{
                background: '#FFFFFF',
                borderRadius: 12,
                padding: frameStyle === 'none' ? 14 : 18,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                color: '#0f172a',
              }}>
                {/* Top Banner if enabled */}
                {(frameStyle === 'top-badge' || frameStyle === 'full-card') && (
                  <div style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: frameBgColor,
                    color: frameTextColor,
                    textAlign: 'center',
                    fontWeight: 800,
                    fontSize: 13,
                    letterSpacing: 1,
                    marginBottom: 10,
                  }}>
                    {frameText}
                  </div>
                )}

                {/* The Canvas holder */}
                <div
                  ref={previewCanvasRef}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 260,
                    minHeight: 260,
                  }}
                />

                {/* Bottom Banner if enabled */}
                {(frameStyle === 'bottom-banner' || frameStyle === 'full-card') && (
                  <div style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: frameBgColor,
                    color: frameTextColor,
                    textAlign: 'center',
                    fontWeight: 800,
                    fontSize: 13,
                    letterSpacing: 1,
                    marginTop: 10,
                  }}>
                    {frameText}
                  </div>
                )}

                {/* Public Instructions Subtitle (Only if provided - Name & Category remain internal to CRM) */}
                {subtitle && subtitle.trim() && frameStyle !== 'none' && (
                  <div style={{ width: '100%', textAlign: 'center', marginTop: 10, paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>{subtitle}</div>
                  </div>
                )}
              </div>

              {/* Action Buttons Hub */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 8 }}>
                  <button
                    type="button"
                    onClick={downloadPng}
                    style={{
                      padding: '11px 16px',
                      borderRadius: 8,
                      border: 'none',
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)',
                    }}
                  >
                    <span>📥</span>
                    <span>Download PNG (HD)</span>
                  </button>

                  <button
                    type="button"
                    onClick={downloadSvg}
                    style={{
                      padding: '11px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: '#1e293b',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                    }}
                  >
                    <span>📐</span>
                    <span>SVG Vector</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {activeWorkingId ? (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => saveToLibrary(false)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 8,
                            border: '1px solid rgba(2, 132, 199, 0.4)',
                            background: 'rgba(2, 132, 199, 0.2)',
                            color: '#38bdf8',
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                          }}
                        >
                          <span>💾</span>
                          <span>Update "{qrName}"</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => saveToLibrary(true)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 8,
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#f59e0b',
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                          }}
                          title="Save as an additional new QR code copy in your library"
                        >
                          <span>📑</span>
                          <span>Save as New Copy</span>
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 8 }}>
                        <button
                          type="button"
                          onClick={resetToNewQr}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1px dashed rgba(56, 189, 248, 0.4)',
                            background: 'rgba(56, 189, 248, 0.1)',
                            color: '#38bdf8',
                            fontWeight: 700,
                            fontSize: 11,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                          }}
                        >
                          <span>➕</span>
                          <span>Create Another QR Code</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowPrintModal(true)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1px solid rgba(255,255,255,0.15)',
                            background: '#1e293b',
                            color: '#e2e8f0',
                            fontWeight: 600,
                            fontSize: 11,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                          }}
                        >
                          <span>🖨️</span>
                          <span>Print Stand</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => saveToLibrary(false)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: '1px solid rgba(34, 197, 94, 0.4)',
                          background: 'rgba(34, 197, 94, 0.2)',
                          color: '#4ade80',
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        <span>💾</span>
                        <span>Save to Library</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowPrintModal(true)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: '1px solid rgba(255,255,255,0.15)',
                          background: '#1e293b',
                          color: '#e2e8f0',
                          fontWeight: 600,
                          fontSize: 12,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        <span>🖨️</span>
                        <span>Print Stand</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Download Resolution Selector */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Download Resolution:</span>
                  <select
                    value={exportSize}
                    onChange={(e) => setExportSize(Number(e.target.value))}
                    style={{ padding: '4px 8px', background: '#090d16', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, color: '#cbd5e1', fontSize: 11 }}
                  >
                    <option value={600}>Standard (600 × 600px)</option>
                    <option value={1200}>High-Res HD (1200 × 1200px)</option>
                    <option value={2400}>Ultra-HD Print (2400 × 2400px)</option>
                  </select>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ── TAB 2: SAVED LIBRARY ────────────────────────────────────────────── */}
      {activeTab === 'library' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Library Controls Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            background: '#131b2e',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: '14px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
              <span style={{ fontSize: 16 }}>🔍</span>
              <input
                type="text"
                placeholder="Search saved codes by name, URL, or category..."
                value={libSearch}
                onChange={(e) => setLibSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#090d16',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: 13,
                }}
              />
              <button
                type="button"
                onClick={resetToNewQr}
                style={{
                  padding: '8px 14px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>➕</span>
                <span>Create New</span>
              </button>
            </div>

            {/* Category Filter Chips */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setLibFilter('all')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 20,
                  border: libFilter === 'all' ? '1.5px solid #0284c7' : '1px solid rgba(255,255,255,0.1)',
                  background: libFilter === 'all' ? '#0284c7' : '#090d16',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                All ({library.length})
              </button>
              {categories.map((c) => {
                const count = library.filter((i) => i.category === c).length;
                if (count === 0 && libFilter !== c) return null;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setLibFilter(c)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 20,
                      border: libFilter === c ? '1.5px solid #0284c7' : '1px solid rgba(255,255,255,0.1)',
                      background: libFilter === c ? '#0284c7' : '#090d16',
                      color: libFilter === c ? '#fff' : '#94a3b8',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {c} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Library Cards Grid */}
          {filteredLibrary.length === 0 ? (
            <div style={{
              background: '#131b2e',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '60px 20px',
              textAlign: 'center',
              color: '#94a3b8',
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📱</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                {library.length === 0 ? 'No QR Codes Saved Yet' : 'No matching codes found'}
              </h3>
              <p style={{ fontSize: 12, margin: '6px 0 16px' }}>
                {library.length === 0
                  ? 'Use the Studio Creator to design and save your first branded QR code.'
                  : 'Try adjusting your search terms or filters.'}
              </p>
              {library.length === 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('studio')}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#0284c7',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Go to Studio Creator
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {filteredLibrary.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: '#131b2e',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 10,
                        background: 'rgba(2, 132, 199, 0.2)',
                        color: '#38bdf8',
                        fontSize: 10,
                        fontWeight: 700,
                      }}>
                        {item.category}
                      </span>
                      <span style={{ fontSize: 11, color: '#64748b' }}>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
                      {item.name}
                    </h4>
                    <p style={{
                      margin: '0 0 12px',
                      fontSize: 11,
                      color: '#94a3b8',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {item.url}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 6, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <button
                      type="button"
                      onClick={() => loadFromLibrary(item)}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: '#1e293b',
                        color: '#38bdf8',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicateItem(item)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        background: 'rgba(245, 158, 11, 0.15)',
                        color: '#fbbf24',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                      title="Duplicate this QR code as a new design"
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        loadFromLibrary(item);
                        setTimeout(() => downloadPng(), 100);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: 'none',
                        background: '#0284c7',
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Download
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteFromLibrary(item.id)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#fca5a5',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                      title="Delete QR Code"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* ── MODAL: MANAGE CATEGORIES ────────────────────────────────────────── */}
      {showCatModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: 16,
        }}>
          <div style={{
            background: '#1e293b',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 12,
            width: '100%',
            maxWidth: 440,
            padding: 20,
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
                Manage Business Categories
              </h3>
              <button
                type="button"
                onClick={() => setShowCatModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 18, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                type="text"
                placeholder="New category name..."
                value={newCatInput}
                onChange={(e) => setNewCatInput(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', background: '#090d16', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#fff', fontSize: 12 }}
              />
              <button
                type="button"
                onClick={() => {
                  const trimmed = newCatInput.trim();
                  if (!trimmed) return;
                  if (categories.includes(trimmed)) return;
                  const updated = [...categories, trimmed];
                  setCategories(updated);
                  setCategory(trimmed);
                  setNewCatInput('');
                  saveLibrary(library, updated);
                }}
                style={{ padding: '8px 14px', background: '#0284c7', border: 'none', borderRadius: 6, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
              >
                Add
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
              {categories.map((c) => (
                <div key={c} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#090d16', borderRadius: 6 }}>
                  <span style={{ fontSize: 12, color: '#e2e8f0' }}>{c}</span>
                  {categories.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = categories.filter((x) => x !== c);
                        setCategories(updated);
                        if (category === c) setCategory(updated[0]);
                        saveLibrary(library, updated);
                      }}
                      style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setShowCatModal(false)}
                style={{ padding: '6px 14px', background: '#0284c7', border: 'none', borderRadius: 6, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: PRINTABLE STAND CENTER ───────────────────────────────────── */}
      {showPrintModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200,
          padding: 16,
        }}>
          <div style={{
            background: '#1e293b',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 12,
            width: '100%',
            maxWidth: 680,
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#0f172a',
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
                  Sunseekers Printable Display Stand Center
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#94a3b8' }}>
                  Formatted for standard A4 / Letter paper for table stands, seat backs &amp; counters
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#131b2e' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>Layout Format:</span>
                <select
                  value={printLayout}
                  onChange={(e) => setPrintLayout(e.target.value as any)}
                  style={{ padding: '6px 10px', background: '#090d16', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#fff', fontSize: 12 }}
                >
                  <option value="stand">Table / Counter Foldable Stand</option>
                  <option value="sticker">Seat-back &amp; Window Sticker (Compact)</option>
                  <option value="single">Large Poster / Display Board</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  padding: '8px 18px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>🖨️</span>
                <span>Print Display Sheet Now</span>
              </button>
            </div>

            {/* Print Preview Sheet */}
            <div style={{ padding: '24px', overflowY: 'auto', background: '#cbd5e1', display: 'flex', justifyContent: 'center' }}>
              <div style={{
                width: 320,
                background: '#FFFFFF',
                borderRadius: 12,
                padding: '24px 20px',
                textAlign: 'center',
                boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                color: '#0f172a',
              }}>
                <div style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  background: frameBgColor,
                  color: frameTextColor,
                  fontWeight: 800,
                  fontSize: 14,
                  letterSpacing: 1,
                  marginBottom: 14,
                }}>
                  {frameText}
                </div>

                <div style={{ width: 200, height: 200, margin: '0 auto', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#64748b' }}>
                  [High-Res QR Code Matrix]
                </div>

                <div style={{ marginTop: 14 }}>
                  {subtitle && subtitle.trim() && (
                    <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{subtitle}</div>
                  )}
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6, letterSpacing: 1 }}>SUNSEEKERS TOURS &amp; TRAVEL</div>
                </div>
              </div>
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', background: '#0f172a', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                style={{ padding: '6px 14px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, color: '#e2e8f0', fontSize: 12, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
