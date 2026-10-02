/**
 * reclassify-jetpack-leads.ts
 *
 * PURPOSE
 * -------
 * When Jetpack CRM contacts were migrated into Sunseekers CRM, they were all
 * created as LeadStage.NEW — even those who were long-standing customers.
 * This script corrects the data so that:
 *
 *   JETPACK_CRM-tagged leads  →  stage = WON, source = OTHER, tags updated
 *   Genuine website leads      →  untouched
 *
 * A lead is considered a "migrated past customer" when ALL of:
 *   • Its tags array contains 'JETPACK_CRM'
 *   • Its stage is currently NEW, CONTACTED, or QUALIFIED
 *     (i.e. it was never progressed — it was just sitting at the default import stage)
 *
 * After reclassification:
 *   • stage  → WON  (so pipeline counts reflect real new prospects only)
 *   • tags   → adds 'MIGRATED_CUSTOMER', removes nothing
 *   • campaign → 'Jetpack CRM Migration - Past Customer'
 *
 * RUN
 * ---
 *   cd apps/backend
 *   npx ts-node --project tsconfig.json -e "require('ts-node/register'); require('./scripts/reclassify-jetpack-leads')"
 *
 * Or with tsx:
 *   npx tsx scripts/reclassify-jetpack-leads.ts
 */

import { PrismaClient, LeadStage, LeadSource } from '@prisma/client';

const prisma = new PrismaClient();

const JETPACK_TAG = 'JETPACK_CRM';
const MIGRATED_TAG = 'MIGRATED_CUSTOMER';
const PAST_CUSTOMER_TAG = 'PAST_CUSTOMER';
const MIGRATION_CAMPAIGN = 'Jetpack CRM Migration - Past Customer';

// Only reclassify leads that are still at the default import stage (NEW).
// CONTACTED and QUALIFIED leads were manually worked by staff — leave them alone.
const UNWORKED_STAGES: LeadStage[] = [LeadStage.NEW];

async function main() {
  console.log('🔍  Scanning for Jetpack-migrated leads to reclassify...\n');

  // ─── 1. Find all leads tagged JETPACK_CRM ───────────────────────────────
  const jetpackLeads = await prisma.lead.findMany({
    where: {
      tags: { has: JETPACK_TAG },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      stage: true,
      source: true,
      tags: true,
      campaign: true,
      customerId: true,
    },
  });

  console.log(`📋  Found ${jetpackLeads.length} leads tagged ${JETPACK_TAG}`);

  const toReclassify = jetpackLeads.filter((l) =>
    UNWORKED_STAGES.includes(l.stage as LeadStage),
  );
  const alreadyProgressed = jetpackLeads.filter(
    (l) => !UNWORKED_STAGES.includes(l.stage as LeadStage),
  );

  console.log(`   • ${toReclassify.length} are in unworked stages (NEW/CONTACTED/QUALIFIED) → will be reclassified as WON (past customer)`);
  console.log(`   • ${alreadyProgressed.length} are already at a progressed stage → skipping\n`);

  if (toReclassify.length === 0) {
    console.log('✅  Nothing to reclassify. All done.');
    return;
  }

  // ─── 2. Reclassify ────────────────────────────────────────────────────────
  let updated = 0;
  let errors = 0;

  for (const lead of toReclassify) {
    try {
      const newTags = Array.from(
        new Set([...lead.tags, MIGRATED_TAG, PAST_CUSTOMER_TAG]),
      );

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          stage: LeadStage.WON,
          campaign: lead.campaign || MIGRATION_CAMPAIGN,
          tags: newTags,
        },
      });

      // Also ensure the linked customer (if any) is marked with PAST_CUSTOMER tag
      if (lead.customerId) {
        const customer = await prisma.customer.findUnique({
          where: { id: lead.customerId },
          select: { tags: true },
        });
        if (customer) {
          const custTags = Array.from(
            new Set([...customer.tags, PAST_CUSTOMER_TAG, MIGRATED_TAG]),
          );
          await prisma.customer.update({
            where: { id: lead.customerId },
            data: { tags: custTags },
          });
        }
      }

      const name = `${lead.firstName ?? ''} ${lead.lastName ?? ''}`.trim() || lead.email || lead.id;
      console.log(`   ✓  ${name}  [${lead.stage} → WON]`);
      updated++;
    } catch (err: any) {
      console.error(`   ✗  Lead ${lead.id}: ${err.message}`);
      errors++;
    }
  }

  // ─── 3. Also tag any customers that have JETPACK_CRM but not PAST_CUSTOMER ─
  console.log('\n🔍  Checking customer records for JETPACK_CRM tag without PAST_CUSTOMER...');
  const jetpackCustomers = await prisma.customer.findMany({
    where: { tags: { has: JETPACK_TAG } },
    select: { id: true, tags: true, firstName: true, lastName: true },
  });

  let custUpdated = 0;
  for (const c of jetpackCustomers) {
    if (!c.tags.includes(PAST_CUSTOMER_TAG)) {
      const newTags = Array.from(new Set([...c.tags, PAST_CUSTOMER_TAG, MIGRATED_TAG]));
      await prisma.customer.update({
        where: { id: c.id },
        data: { tags: newTags },
      });
      custUpdated++;
    }
  }
  console.log(`   Updated ${custUpdated} customer(s) with PAST_CUSTOMER tag\n`);

  // ─── 4. Summary ──────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊  RECLASSIFICATION SUMMARY');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Leads reclassified to WON  : ${updated}`);
  console.log(`  Leads with errors           : ${errors}`);
  console.log(`  Leads already progressed    : ${alreadyProgressed.length} (untouched)`);
  console.log(`  Customers tagged            : ${custUpdated}`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n✅  Done. Your pipeline now shows only true new prospects.\n');
  console.log('ℹ️   Future leads:');
  console.log('   • New website submissions  → source=WEBSITE, stage=NEW  (genuine new leads)');
  console.log('   • Manual entries           → stage=NEW, source as selected');
  console.log('   • Jetpack migrations       → stage=WON, tagged MIGRATED_CUSTOMER');
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
