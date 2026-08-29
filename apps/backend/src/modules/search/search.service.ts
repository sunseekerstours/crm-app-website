import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';

export interface SearchResult {
  customers: unknown[];
  companies: unknown[];
  contacts: unknown[];
  leads: unknown[];
  deals: unknown[];
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  /** Global search across CRM records (PRD §63). */
  async search(q: string, limit = 10): Promise<SearchResult> {
    const term = q.trim();
    if (!term) return { customers: [], companies: [], contacts: [], leads: [], deals: [] };

    const like = { contains: term, mode: 'insensitive' as const };

    const [customers, companies, contacts, leads, deals] = await Promise.all([
      this.prisma.customer.findMany({
        where: { OR: [{ firstName: like }, { lastName: like }, { email: like }, { phone: like }] },
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          whatsapp: true,
          status: true,
        },
      }),
      this.prisma.company.findMany({
        where: { OR: [{ name: like }, { email: like }, { phone: like }] },
        take: limit,
        select: { id: true, name: true, email: true, phone: true, industry: true },
      }),
      this.prisma.contact.findMany({
        where: { OR: [{ firstName: like }, { lastName: like }, { email: like }, { phone: like }] },
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          companyId: true,
          company: { select: { name: true } },
        },
      }),
      this.prisma.lead.findMany({
        where: { OR: [{ firstName: like }, { lastName: like }, { email: like }, { phone: like }] },
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          stage: true,
        },
      }),
      this.prisma.deal.findMany({
        where: {
          OR: [
            { name: like },
            { tour: like },
            { destination: like },
            { notes: like },
            { customer: { is: { OR: [{ firstName: like }, { lastName: like }] } } },
          ],
        },
        take: limit,
        select: { id: true, name: true, tour: true, destination: true, stage: true, value: true },
      }),
    ]);

    return { customers, companies, contacts, leads, deals };
  }
}
