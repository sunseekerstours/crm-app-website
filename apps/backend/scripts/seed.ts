import { PrismaClient } from '@prisma/client';
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
