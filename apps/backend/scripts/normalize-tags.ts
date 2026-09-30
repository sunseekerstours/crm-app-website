import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function normalizeTags(tags: string[]): string[] {
  if (!Array.isArray(tags)) return [];
  const set = new Set<string>();
  for (const t of tags) {
    if (!t) continue;
    const parts = String(t).split(/[,|;]/);
    for (const p of parts) {
      const clean = p
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^["']|["']$/g, '');
      if (clean && clean.length > 1 && !/^\d{7,}$/.test(clean) && !clean.includes('@')) {
        set.add(clean);
      }
    }
  }
  return Array.from(set).sort();
}

async function run() {
  console.log('[Normalize Tags] Cleaning customer tags in database...');
  const customers = await prisma.customer.findMany({ select: { id: true, tags: true } });
  let custUpdated = 0;
  for (const c of customers) {
    const normalized = normalizeTags(c.tags);
    if (JSON.stringify(normalized) !== JSON.stringify(c.tags)) {
      await prisma.customer.update({ where: { id: c.id }, data: { tags: normalized } });
      custUpdated++;
    }
  }

  console.log('[Normalize Tags] Cleaning lead tags in database...');
  const leads = await prisma.lead.findMany({ select: { id: true, tags: true } });
  let leadUpdated = 0;
  for (const l of leads) {
    const normalized = normalizeTags(l.tags);
    if (JSON.stringify(normalized) !== JSON.stringify(l.tags)) {
      await prisma.lead.update({ where: { id: l.id }, data: { tags: normalized } });
      leadUpdated++;
    }
  }

  console.log(`[Normalize Tags] Completed: ${custUpdated} customers updated, ${leadUpdated} leads updated.`);
}

if (require.main === module) {
  run()
    .then(() => prisma.$disconnect())
    .catch((err) => {
      console.error(err);
      prisma.$disconnect().then(() => process.exit(1));
    });
}
