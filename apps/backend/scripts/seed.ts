import { Prisma, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { SYSTEM_ROLES } from '../src/common/roles';
import { ALL_PERMISSIONS, Permission } from '../src/common/permissions';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding permissions...');
  for (const key of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key },
      create: { key, description: null },
      update: {},
    });
  }

  console.log('Seeding system roles...');
  for (const preset of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { name: preset.name },
      create: {
        name: preset.name,
        description: preset.description,
        isSystem: preset.isSystem,
      },
      update: { description: preset.description, isSystem: preset.isSystem },
    });

    const permissionKeys = preset.permissions.length
      ? preset.permissions
      : Object.values(Permission);

    const perms = await prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    });
  }

  const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@sunseeker.local').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'ChangeMe123!';
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '10', 10);

  console.log('Seeding public site settings...');
  const navMenus = [
    { label: 'Home', href: '/' },
    { label: 'Tours', href: '/tours' },
    { label: 'Ghana Tours', href: '/tours/ghana' },
    { label: 'International Tours', href: '/tours/international' },
    { label: 'Flights', href: '/flights' },
    { label: 'Hotels', href: '/hotels' },
    { label: 'Car Rentals', href: '/car-rentals' },
    { label: 'Destinations', href: '/destinations' },
    { label: 'Contact', href: '/contact' },
  ];

  const siteSettings: {
    key: string;
    group: string;
    value?: string;
    valueJson?: Record<string, unknown>;
    description: string;
    isPublic?: boolean;
  }[] = [
    // General
    { key: 'site_name', group: 'general', value: 'Sunseekers Tours', description: 'Public site name', isPublic: true },
    { key: 'tagline', group: 'general', value: 'Discover Ghana & the World', description: 'Short site tagline', isPublic: true },
    { key: 'site_description', group: 'general', value: 'Sunseekers Tours & Travel — curated Ghana and international tour packages.', description: 'SEO/meta site description', isPublic: true },
    { key: 'site_logo_url', group: 'general', value: '', description: 'URL of the site logo image', isPublic: true },
    { key: 'currency', group: 'general', value: 'GHS', description: 'Default currency symbol/code for the site', isPublic: true },
    // Navigation
    { key: 'nav_menus', group: 'navigation', valueJson: { nav_menus: navMenus }, description: 'Public website top navigation menu items (array of {label, href})', isPublic: true },
    { key: 'footer_menus', group: 'navigation', valueJson: { footer_menus: [{ label: 'About Us', href: '/about' }, { label: 'Contact', href: '/contact' }, { label: 'Privacy Policy', href: '/privacy' }, { label: 'Terms', href: '/terms' }] }, description: 'Public website footer links (array of {label, href})', isPublic: true },
    // Contact
    { key: 'contact_phone', group: 'contact', value: '+233 20 123 4567', description: 'Main contact phone number', isPublic: true },
    { key: 'contact_email', group: 'contact', value: 'bookings@sunseekers.example', description: 'Main contact / booking email', isPublic: true },
    { key: 'contact_address', group: 'contact', value: 'Accra, Ghana', description: 'Office / physical address', isPublic: true },
    { key: 'contact_whatsapp', group: 'contact', value: '+233 20 123 4567', description: 'WhatsApp number for inquiries', isPublic: true },
    // Social
    { key: 'social_facebook', group: 'social', value: 'https://facebook.com/', description: 'Facebook profile URL', isPublic: true },
    { key: 'social_instagram', group: 'social', value: 'https://instagram.com/', description: 'Instagram profile URL', isPublic: true },
    { key: 'social_twitter', group: 'social', value: 'https://twitter.com/', description: 'Twitter/X profile URL', isPublic: true },
    { key: 'social_youtube', group: 'social', value: 'https://youtube.com/', description: 'YouTube channel URL', isPublic: true },
    { key: 'social_tiktok', group: 'social', value: 'https://tiktok.com/', description: 'TikTok profile URL', isPublic: true },
    // SEO
    { key: 'seo_default_title', group: 'seo', value: 'Sunseekers Tours & Travel', description: 'Default page title suffix / SEO title', isPublic: true },
    { key: 'seo_default_description', group: 'seo', value: 'Explore curated Ghana and international travel packages with Sunseekers.', description: 'Default meta description', isPublic: true },
    { key: 'seo_og_image', group: 'seo', value: '', description: 'Default Open Graph / social share image URL', isPublic: true },
  ];

  for (const s of siteSettings) {
    await prisma.siteSetting.upsert({
      where: { key: s.key },
      create: {
        key: s.key,
        group: s.group,
        value: s.value,
        valueJson: s.valueJson as Prisma.InputJsonValue | undefined,
        description: s.description,
        isPublic: s.isPublic ?? false,
      },
      update: {
        group: s.group,
        description: s.description,
        isPublic: s.isPublic ?? false,
      },
    });
  }

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log(`Admin user already exists: ${adminEmail}`);
    return;
  }

  const superAdmin = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
  if (!superAdmin) throw new Error('SUPER_ADMIN role not found');

  const passwordHash = await bcrypt.hash(adminPassword, saltRounds);
  await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash,
      firstName: 'System',
      lastName: 'Admin',
      status: 'ACTIVE',
      roles: { create: { roleId: superAdmin.id } },
    },
  });

  console.log(`Created admin user: ${adminEmail}`);
  console.log('Seeding complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
