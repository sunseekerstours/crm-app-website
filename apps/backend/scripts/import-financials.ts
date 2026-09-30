import { PrismaClient } from '@prisma/client';
import { executeFinancialSync } from '../src/modules/jetpack-crm/jetpack-financials';

const prisma = new PrismaClient();

export async function importFinancials() {
  return executeFinancialSync(prisma);
}

if (require.main === module) {
  importFinancials()
    .then(() => prisma.$disconnect())
    .catch((err) => {
      console.error('[Financial Import Error]', err);
      prisma.$disconnect().then(() => process.exit(1));
    });
}
