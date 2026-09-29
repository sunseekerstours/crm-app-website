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

  // Prune permissions that no longer exist in the catalog (e.g. when a feature
  // is retired) so they stop appearing in the admin permission matrix and stop
  // being granted to anyone.
  const stale = await prisma.permission.findMany({
    where: { key: { notIn: ALL_PERMISSIONS } },
    select: { id: true, key: true },
  });
  if (stale.length > 0) {
    await prisma.rolePermission.deleteMany({
      where: { permissionId: { in: stale.map((p) => p.id) } },
    });
    await prisma.permission.deleteMany({ where: { id: { in: stale.map((p) => p.id) } } });
    console.log(`Pruned ${stale.length} retired permission(s): ${stale.map((p) => p.key).join(', ')}`);
  }

  console.log('Seeding system roles...');
  for (const preset of SYSTEM_ROLES) {
    const existingRole = await prisma.role.findUnique({ where: { name: preset.name } });
    const role = existingRole
      ? existingRole
      : await prisma.role.create({
          data: {
            name: preset.name,
            description: preset.description,
            isSystem: preset.isSystem,
          },
        });

    const permissionKeys = preset.permissions.length
      ? preset.permissions
      : Object.values(Permission);

    // SUPER_ADMIN must always hold every permission, including ones added by
    // later releases, so its access never depends on a stale seed snapshot.
    // Everything else is only seeded on first creation: afterwards the stored
    // grants are the source of truth so admin edits survive a redeploy.
    const shouldApplyPreset = !existingRole || preset.name === 'SUPER_ADMIN';

    if (shouldApplyPreset) {
      const perms = await prisma.permission.findMany({
        where: { key: { in: permissionKeys } },
      });
      if (preset.name === 'SUPER_ADMIN') {
        // Additive only: never revoke, so a deploy cannot strip the super admin.
        await prisma.rolePermission.createMany({
          data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })),
          skipDuplicates: true,
        });
      } else {
        await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
        await prisma.rolePermission.createMany({
          data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })),
          skipDuplicates: true,
        });
      }
    } else {
      console.log(`  ${preset.name}: keeping administrator-managed permissions`);
    }
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
    // Automations (Operations & Sales)
    { key: 'automation_auto_assign_lead', group: 'automation', value: 'true', description: 'Auto-assign new inbound leads to active sales agents', isPublic: false },
    { key: 'automation_assign_mode', group: 'automation', value: 'LEAST_BUSY', description: 'Lead assignment algorithm (LEAST_BUSY or ROUND_ROBIN)', isPublic: false },
    { key: 'automation_immediate_follow_up_task', group: 'automation', value: 'true', description: 'Create high-priority follow-up task on lead assignment', isPublic: false },
    { key: 'automation_lead_sla_hours', group: 'automation', value: '2', description: 'New lead response SLA in hours', isPublic: false },
    { key: 'automation_client_silence_follow_up', group: 'automation', value: 'true', description: 'Follow-up nudge when client has not responded', isPublic: false },
    { key: 'automation_client_silence_days', group: 'automation', value: '3', description: 'Days before client silence nudge', isPublic: false },
    { key: 'automation_lead_to_deal_on_qualified', group: 'automation', value: 'true', description: 'Auto-create sales opportunity Deal when lead is Qualified', isPublic: false },
    { key: 'automation_default_deal_value', group: 'automation', value: '2500', description: 'Default estimated deal value', isPublic: false },
    { key: 'automation_default_currency', group: 'automation', value: 'USD', description: 'Default pipeline deal currency', isPublic: false },
    { key: 'automation_auto_draft_quote', group: 'automation', value: 'true', description: 'Auto-generate draft quotation for opportunity', isPublic: false },
    { key: 'automation_quote_validity_days', group: 'automation', value: '14', description: 'Days until quote expires', isPublic: false },
    { key: 'automation_deal_to_invoice_on_won', group: 'automation', value: 'true', description: 'Auto-generate invoice when Deal is marked Won', isPublic: false },
    { key: 'automation_invoice_due_days', group: 'automation', value: '7', description: 'Days until invoice due date', isPublic: false },
    { key: 'automation_auto_receipt_on_payment', group: 'automation', value: 'true', description: 'Auto-generate receipt and mark invoice paid upon payment confirmation', isPublic: false },
    { key: 'automation_receipt_prefix', group: 'automation', value: 'REC', description: 'Prefix for generated payment receipts', isPublic: false },
    { key: 'automation_post_sale_follow_up', group: 'automation', value: 'true', description: 'Auto-create post-sale care & welcome pack task upon payment', isPublic: false },
    { key: 'automation_post_sale_sla_hours', group: 'automation', value: '48', description: 'Hours after payment to dispatch welcome pack', isPublic: false },
    { key: 'automation_duplicate_detection', group: 'automation', value: 'true', description: 'Check for duplicate email/phone and link to existing customer', isPublic: false },
    { key: 'automation_duplicate_strategy', group: 'automation', value: 'BOTH', description: 'Duplicate detection strategy (BOTH, EMAIL, PHONE)', isPublic: false },
    { key: 'automation_sales_inactivity_escalation', group: 'automation', value: 'true', description: 'Monitor pipeline and escalate neglected leads/deals to manager via Telegram', isPublic: false },
    { key: 'automation_inactivity_escalate_hours', group: 'automation', value: '48', description: 'Hours without pipeline activity before manager escalation', isPublic: false },
    { key: 'automation_quote_follow_up', group: 'automation', value: 'true', description: 'Remind salesperson when quote has been pending', isPublic: false },
    { key: 'automation_quote_follow_up_days', group: 'automation', value: '3', description: 'Days pending quote before follow up reminder', isPublic: false },
    { key: 'automation_overdue_payment_escalation', group: 'automation', value: 'true', description: 'Monitor overdue invoices and escalate to Finance and Manager', isPublic: false },
    { key: 'automation_overdue_tier1_days', group: 'automation', value: '1', description: 'Days overdue before Tier-1 agent reminder', isPublic: false },
    { key: 'automation_overdue_tier3_days', group: 'automation', value: '7', description: 'Days overdue before Tier-3 Telegram escalation', isPublic: false },
    // Telegram
    { key: 'telegram_enabled', group: 'telegram', value: 'true', description: 'Enable Telegram bot notifications for sales & operations', isPublic: false },
    { key: 'telegram_bot_token', group: 'telegram', value: '', description: 'Telegram Bot Token from @BotFather', isPublic: false },
    { key: 'telegram_chat_id', group: 'telegram', value: '', description: 'Telegram Group/Channel Chat ID for alerts', isPublic: false },
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
