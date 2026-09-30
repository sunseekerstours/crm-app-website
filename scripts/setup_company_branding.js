const fs = require('fs');
const path = require('path');

const srcLogo = path.join(
  'C:',
  'Users',
  'Charis Computer Hub',
  '.gemini',
  'antigravity-ide',
  'brain',
  '53df8ce2-ee38-4524-964a-7efb9ae68993',
  '.user_uploaded',
  'media_1790795216618.png'
);

const targets = [
  path.join(__dirname, '..', 'apps', 'web', 'public', 'logo.png'),
  path.join(__dirname, '..', 'apps', 'admin', 'public', 'logo.png'),
  path.join(__dirname, '..', 'apps', 'site', 'public', 'logo.png'),
];

targets.forEach(t => {
  const dir = path.dirname(t);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(srcLogo, t);
  console.log('Copied logo to:', t);
});

// Also generate base64 data URI in a shared constants file
const logoBuffer = fs.readFileSync(srcLogo);
const logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;

const companyDetailsTs = `// Sunseekers Tours Official Company Details & Logo
export const COMPANY_DETAILS = {
  name: 'Sunseekers Tours',
  tagline: '...Memories of our Tours are Forever',
  address: 'Opp. Trust Towers, 9 Farrar Ave, Accra',
  phone: '030 222 5393',
  email: 'info@sunseekerstours.com',
  website: 'https://sunseekerstours.com',
  logoUrl: '/logo.png',
  logoBase64: '${logoBase64}',
  colors: {
    primaryGreen: '#16a34a',
    forestGreen: '#15803d',
    sunOrange: '#f97316',
    sunGold: '#f59e0b',
    darkBg: '#0b1320',
    cardBg: '#131f33',
    cardBorder: 'rgba(255,255,255,0.08)',
  }
};
`;

fs.writeFileSync(path.join(__dirname, '..', 'apps', 'web', 'lib', 'company.ts'), companyDetailsTs);
fs.writeFileSync(path.join(__dirname, '..', 'apps', 'admin', 'lib', 'company.ts'), companyDetailsTs);

console.log('Generated company.ts in apps/web/lib and apps/admin/lib');
