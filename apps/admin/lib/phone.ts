/**
 * Comprehensive Phone Utility for Sunseekers Tours & Travel (Admin)
 * Provides:
 * - Ghanaian phone number detection (+233 & local 10-digit formats e.g. 024, 055, 020)
 * - Country code detection with flags (🇬🇭 Ghana, 🇬🇧 UK, 🇮🇹 Italy, 🇺🇸 US, etc.)
 * - Standardized display formatting
 * - Safe WhatsApp URL generator (ensuring country code without leading zero or +)
 * - Safe Tel URL generator
 * - Handles and repairs Excel scientific notation imports (e.g. 3.93464E+11)
 */

export interface PhoneInfo {
  raw: string;
  formatted: string;
  displayWithFlag: string;
  e164: string;
  whatsAppDigits: string;
  whatsAppUrl: string;
  telUrl: string;
  countryCode: string;
  countryName: string;
  countryIso: string;
  flag: string;
  isGhana: boolean;
  network?: string;
}

interface CountryMeta {
  code: string;       // Calling prefix e.g. "233"
  name: string;       // Country name
  iso: string;        // ISO 2-letter
  flag: string;       // Emoji flag
  format?: (rest: string) => string;
}

const COUNTRIES: CountryMeta[] = [
  // Ghana
  {
    code: '233',
    name: 'Ghana',
    iso: 'GH',
    flag: '🇬🇭',
    format: (rest) => {
      const net = rest.slice(0, 2);
      const mid = rest.slice(2, 5);
      const end = rest.slice(5);
      return `+233 ${net} ${mid} ${end}`.trim();
    },
  },
  // Caribbean & Special North America
  {
    code: '1868',
    name: 'Trinidad & Tobago',
    iso: 'TT',
    flag: '🇹🇹',
    format: (rest) => `+1 868 ${rest.slice(0, 3)} ${rest.slice(3)}`.trim(),
  },
  {
    code: '1246',
    name: 'Barbados',
    iso: 'BB',
    flag: '🇧🇧',
    format: (rest) => `+1 246 ${rest.slice(0, 3)} ${rest.slice(3)}`.trim(),
  },
  // United Kingdom
  {
    code: '44',
    name: 'United Kingdom',
    iso: 'GB',
    flag: '🇬🇧',
    format: (rest) => {
      if (rest.length === 10) return `+44 ${rest.slice(0, 4)} ${rest.slice(4)}`;
      return `+44 ${rest}`;
    },
  },
  // United States & Canada
  {
    code: '1',
    name: 'United States',
    iso: 'US',
    flag: '🇺🇸',
    format: (rest) => `+1 (${rest.slice(0, 3)}) ${rest.slice(3, 6)}-${rest.slice(6)}`,
  },
  // Italy
  {
    code: '39',
    name: 'Italy',
    iso: 'IT',
    flag: '🇮🇹',
    format: (rest) => `+39 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`.trim(),
  },
  // France
  {
    code: '33',
    name: 'France',
    iso: 'FR',
    flag: '🇫🇷',
    format: (rest) => `+33 ${rest.slice(0, 1)} ${rest.slice(1, 3)} ${rest.slice(3, 5)} ${rest.slice(5, 7)} ${rest.slice(7)}`.trim(),
  },
  // Germany
  {
    code: '49',
    name: 'Germany',
    iso: 'DE',
    flag: '🇩🇪',
    format: (rest) => `+49 ${rest.slice(0, 3)} ${rest.slice(3)}`.trim(),
  },
  // Netherlands
  {
    code: '31',
    name: 'Netherlands',
    iso: 'NL',
    flag: '🇳🇱',
    format: (rest) => `+31 ${rest.slice(0, 2)} ${rest.slice(2, 5)} ${rest.slice(5)}`.trim(),
  },
  // Spain
  {
    code: '34',
    name: 'Spain',
    iso: 'ES',
    flag: '🇪🇸',
    format: (rest) => `+34 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`.trim(),
  },
  // Switzerland
  {
    code: '41',
    name: 'Switzerland',
    iso: 'CH',
    flag: '🇨🇭',
    format: (rest) => `+41 ${rest.slice(0, 2)} ${rest.slice(2, 5)} ${rest.slice(5)}`.trim(),
  },
  // Belgium
  {
    code: '32',
    name: 'Belgium',
    iso: 'BE',
    flag: '🇧🇪',
    format: (rest) => `+32 ${rest.slice(0, 3)} ${rest.slice(3, 5)} ${rest.slice(5, 7)} ${rest.slice(7)}`.trim(),
  },
  // Nigeria
  {
    code: '234',
    name: 'Nigeria',
    iso: 'NG',
    flag: '🇳🇬',
    format: (rest) => `+234 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`.trim(),
  },
  // Côte d'Ivoire
  {
    code: '225',
    name: "Côte d'Ivoire",
    iso: 'CI',
    flag: '🇨🇮',
    format: (rest) => `+225 ${rest.slice(0, 2)} ${rest.slice(2, 4)} ${rest.slice(4, 6)} ${rest.slice(6, 8)} ${rest.slice(8)}`.trim(),
  },
  // Senegal
  {
    code: '221',
    name: 'Senegal',
    iso: 'SN',
    flag: '🇸🇳',
    format: (rest) => `+221 ${rest.slice(0, 2)} ${rest.slice(2, 5)} ${rest.slice(5)}`.trim(),
  },
  // South Africa
  {
    code: '27',
    name: 'South Africa',
    iso: 'ZA',
    flag: '🇿🇦',
    format: (rest) => `+27 ${rest.slice(0, 2)} ${rest.slice(2, 5)} ${rest.slice(5)}`.trim(),
  },
  // Kenya
  {
    code: '254',
    name: 'Kenya',
    iso: 'KE',
    flag: '🇰🇪',
    format: (rest) => `+254 ${rest.slice(0, 3)} ${rest.slice(3)}`.trim(),
  },
  // UAE
  {
    code: '971',
    name: 'United Arab Emirates',
    iso: 'AE',
    flag: '🇦🇪',
    format: (rest) => `+971 ${rest.slice(0, 2)} ${rest.slice(2, 5)} ${rest.slice(5)}`.trim(),
  },
  // Turkey
  {
    code: '90',
    name: 'Turkey',
    iso: 'TR',
    flag: '🇹🇷',
    format: (rest) => `+90 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6, 8)} ${rest.slice(8)}`.trim(),
  },
  // India
  {
    code: '91',
    name: 'India',
    iso: 'IN',
    flag: '🇮🇳',
    format: (rest) => `+91 ${rest.slice(0, 5)} ${rest.slice(5)}`.trim(),
  },
  // China
  {
    code: '86',
    name: 'China',
    iso: 'CN',
    flag: '🇨🇳',
    format: (rest) => `+86 ${rest.slice(0, 3)} ${rest.slice(3, 7)} ${rest.slice(7)}`.trim(),
  },
  // Australia
  {
    code: '61',
    name: 'Australia',
    iso: 'AU',
    flag: '🇦🇺',
    format: (rest) => `+61 ${rest.slice(0, 1)} ${rest.slice(1, 5)} ${rest.slice(5)}`.trim(),
  },
  // Egypt
  {
    code: '20',
    name: 'Egypt',
    iso: 'EG',
    flag: '🇪🇬',
    format: (rest) => `+20 ${rest.slice(0, 2)} ${rest.slice(2, 6)} ${rest.slice(6)}`.trim(),
  },
  // Morocco
  {
    code: '212',
    name: 'Morocco',
    iso: 'MA',
    flag: '🇲🇦',
    format: (rest) => `+212 ${rest.slice(0, 3)} ${rest.slice(3)}`.trim(),
  },
  // Rwanda
  {
    code: '250',
    name: 'Rwanda',
    iso: 'RW',
    flag: '🇷🇼',
    format: (rest) => `+250 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`.trim(),
  },
  // Tanzania
  {
    code: '255',
    name: 'Tanzania',
    iso: 'TZ',
    flag: '🇹🇿',
    format: (rest) => `+255 ${rest.slice(0, 2)} ${rest.slice(2, 5)} ${rest.slice(5)}`.trim(),
  },
  // Uganda
  {
    code: '256',
    name: 'Uganda',
    iso: 'UG',
    flag: '🇺🇬',
    format: (rest) => `+256 ${rest.slice(0, 3)} ${rest.slice(3)}`.trim(),
  },
];

const GHANA_NETWORKS: Record<string, string> = {
  '24': 'MTN',
  '54': 'MTN',
  '55': 'MTN',
  '59': 'MTN',
  '53': 'MTN',
  '20': 'Telecel (Vodafone)',
  '50': 'Telecel (Vodafone)',
  '27': 'AT (AirtelTigo)',
  '57': 'AT (AirtelTigo)',
  '26': 'AT (AirtelTigo)',
  '56': 'AT (AirtelTigo)',
  '28': 'Expresso',
  '30': 'Accra Landline',
  '32': 'Kumasi Landline',
};

/**
 * Parses any phone number input into structured metadata with country code,
 * Ghana recognition, WhatsApp formatting, and display flag.
 */
export function parsePhoneNumber(phone?: string | null, countryHint?: string | null): PhoneInfo {
  if (!phone) {
    return {
      raw: '',
      formatted: '',
      displayWithFlag: '',
      e164: '',
      whatsAppDigits: '',
      whatsAppUrl: '',
      telUrl: '',
      countryCode: '',
      countryName: '',
      countryIso: '',
      flag: '📞',
      isGhana: false,
    };
  }

  let str = String(phone).trim();

  // 1. Resolve Excel scientific notation (e.g. 3.93464E+11, 4.4735E+11)
  if (/[eE]\+?\d+/.test(str)) {
    const num = Number(str);
    if (!isNaN(num)) {
      try {
        str = BigInt(Math.round(num)).toString();
      } catch {
        // keep str
      }
    }
  }

  const hasLeadingPlus = str.startsWith('+');
  const digits = str.replace(/\D/g, '');

  if (!digits || digits.length < 5) {
    return {
      raw: str,
      formatted: str,
      displayWithFlag: str,
      e164: str,
      whatsAppDigits: digits,
      whatsAppUrl: digits ? `https://wa.me/${digits}` : '',
      telUrl: `tel:${str}`,
      countryCode: '',
      countryName: '',
      countryIso: '',
      flag: '📞',
      isGhana: false,
    };
  }

  // 2. GHANA DETECTION
  const isGhanaHint = (countryHint || '').toLowerCase().includes('ghana');
  const ghanaPrefixes = ['024', '054', '055', '059', '053', '020', '050', '027', '057', '026', '056', '030', '031', '032', '033', '034', '035', '036', '037', '038', '039'];

  // Case A: Number starts with 233
  if (digits.startsWith('233') && digits.length >= 11) {
    const rest = digits.slice(3); // 9 digits
    const netPrefix = rest.slice(0, 2);
    const network = GHANA_NETWORKS[netPrefix] || 'Ghana Network';
    const mid = rest.slice(2, 5);
    const end = rest.slice(5);
    const formatted = `+233 ${netPrefix} ${mid} ${end}`.trim();
    const whatsAppDigits = `233${rest}`;

    return {
      raw: str,
      formatted,
      displayWithFlag: `🇬🇭 ${formatted}`,
      e164: `+233${rest}`,
      whatsAppDigits,
      whatsAppUrl: `https://wa.me/${whatsAppDigits}`,
      telUrl: `tel:+233${rest}`,
      countryCode: '+233',
      countryName: 'Ghana',
      countryIso: 'GH',
      flag: '🇬🇭',
      isGhana: true,
      network,
    };
  }

  // Case B: Local Ghanaian 10-digit number (e.g. 0243705455, 0550244242, 0201234567)
  const startsWithLocalGh = ghanaPrefixes.some((p) => digits.startsWith(p));
  if (digits.length === 10 && digits.startsWith('0') && (startsWithLocalGh || isGhanaHint)) {
    const rest = digits.slice(1); // 9 digits
    const netPrefix = rest.slice(0, 2);
    const network = GHANA_NETWORKS[netPrefix] || 'Ghana Network';
    const mid = rest.slice(2, 5);
    const end = rest.slice(5);
    const formatted = `+233 ${netPrefix} ${mid} ${end}`.trim();
    const whatsAppDigits = `233${rest}`;

    return {
      raw: str,
      formatted,
      displayWithFlag: `🇬🇭 ${formatted}`,
      e164: `+233${rest}`,
      whatsAppDigits,
      whatsAppUrl: `https://wa.me/${whatsAppDigits}`,
      telUrl: `tel:+233${rest}`,
      countryCode: '+233',
      countryName: 'Ghana',
      countryIso: 'GH',
      flag: '🇬🇭',
      isGhana: true,
      network,
    };
  }

  // Case C: 9 digits with Ghana hint or network prefix
  if (digits.length === 9 && (isGhanaHint || GHANA_NETWORKS[digits.slice(0, 2)])) {
    const netPrefix = digits.slice(0, 2);
    const network = GHANA_NETWORKS[netPrefix] || 'Ghana Network';
    const mid = digits.slice(2, 5);
    const end = digits.slice(5);
    const formatted = `+233 ${netPrefix} ${mid} ${end}`.trim();
    const whatsAppDigits = `233${digits}`;

    return {
      raw: str,
      formatted,
      displayWithFlag: `🇬🇭 ${formatted}`,
      e164: `+233${digits}`,
      whatsAppDigits,
      whatsAppUrl: `https://wa.me/${whatsAppDigits}`,
      telUrl: `tel:+233${digits}`,
      countryCode: '+233',
      countryName: 'Ghana',
      countryIso: 'GH',
      flag: '🇬🇭',
      isGhana: true,
      network,
    };
  }

  // 3. INTERNATIONAL COUNTRIES LOOKUP
  for (const c of COUNTRIES) {
    if (digits.startsWith(c.code)) {
      const rest = digits.slice(c.code.length);
      const formatted = c.format ? c.format(rest) : `+${c.code} ${rest}`;
      const whatsAppDigits = `${c.code}${rest}`;

      return {
        raw: str,
        formatted,
        displayWithFlag: `${c.flag} ${formatted}`,
        e164: `+${c.code}${rest}`,
        whatsAppDigits,
        whatsAppUrl: `https://wa.me/${whatsAppDigits}`,
        telUrl: `tel:+${c.code}${rest}`,
        countryCode: `+${c.code}`,
        countryName: c.name,
        countryIso: c.iso,
        flag: c.flag,
        isGhana: c.code === '233',
      };
    }
  }

  // 4. Fallback for unknown country
  const e164 = hasLeadingPlus ? `+${digits}` : `+${digits}`;
  const formatted = hasLeadingPlus ? `+${digits}` : digits;

  return {
    raw: str,
    formatted,
    displayWithFlag: `📞 ${formatted}`,
    e164,
    whatsAppDigits: digits,
    whatsAppUrl: `https://wa.me/${digits}`,
    telUrl: `tel:${e164}`,
    countryCode: '',
    countryName: countryHint || 'International',
    countryIso: '',
    flag: '📞',
    isGhana: false,
  };
}

/**
 * Backwards compatible helper: returns clean display string
 */
export function formatDisplayPhone(phone?: string | null, countryHint?: string | null): string {
  const info = parsePhoneNumber(phone, countryHint);
  return info.formatted;
}

/**
 * Returns WhatsApp click-to-chat URL with properly encoded international number
 */
export function getWhatsAppUrl(phone?: string | null, message?: string): string {
  const info = parsePhoneNumber(phone);
  if (!info.whatsAppDigits) return '';
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${info.whatsAppDigits}${text}`;
}

/**
 * Returns telephone click-to-call link
 */
export function getTelUrl(phone?: string | null): string {
  const info = parsePhoneNumber(phone);
  return info.telUrl;
}

/**
 * Returns whether phone number belongs to Ghana
 */
export function isGhanaianPhone(phone?: string | null): boolean {
  return parsePhoneNumber(phone).isGhana;
}
