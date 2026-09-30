import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';
import { InvoicesService } from '@app/modules/invoices/invoices.service';
import { QuotesService } from '@app/modules/quotes/quotes.service';
import { ApiNotFoundException, ApiConflictException, ErrorCode } from '@app/common/errors';
import { RequestContext } from '@app/common/request-context';
import { CreateFleetBookingDto } from './dto/create-fleet-booking.dto';
import { UpdateFleetBookingDto } from './dto/update-fleet-booking.dto';
import { AuditableAction, InvoiceStatus } from '@prisma/client';

export interface FleetListParams {
  page: number;
  limit: number;
  vehicleId?: string;
  customerId?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class FleetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly invoicesService: InvoicesService,
    private readonly quotesService: QuotesService,
  ) {}

  private get fleetBooking(): any {
    return (this.prisma as any).fleetBooking;
  }

  async create(dto: CreateFleetBookingDto, ctx: RequestContext) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } });
    if (!vehicle) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Vehicle not found');

    const start = new Date(dto.startDate);
    const end   = new Date(dto.endDate);
    if (end < start) throw new ApiConflictException(ErrorCode.BAD_REQUEST, 'endDate must be on or after startDate');

    // ── Conflict Check: Vehicle Availability ─────────────────────
    if (!dto.allowOverlap) {
      const conflictVehicle = await this.fleetBooking.findFirst({
        where: {
          vehicleId: dto.vehicleId,
          AND: [
            { startDate: { lte: end } },
            { endDate:   { gte: start } },
          ],
        },
      });

      if (conflictVehicle) {
        const cStart = conflictVehicle.startDate.toISOString().split('T')[0];
        const cEnd = conflictVehicle.endDate.toISOString().split('T')[0];
        throw new ApiConflictException(
          ErrorCode.BAD_REQUEST,
          `Vehicle "${vehicle.name}" is already booked by "${conflictVehicle.company}" from ${cStart} to ${cEnd}.`,
        );
      }
    }

    // ── Conflict Check: Driver Availability ──────────────────────
    if (!dto.allowOverlap && (dto.driverId || dto.driverName)) {
      const driverConditions: any[] = [];
      if (dto.driverId) driverConditions.push({ driverId: dto.driverId });
      if (dto.driverName) driverConditions.push({ driverName: dto.driverName });

      const conflictDriver = await this.fleetBooking.findFirst({
        where: {
          OR: driverConditions,
          AND: [
            { startDate: { lte: end } },
            { endDate:   { gte: start } },
          ],
        },
        include: { vehicle: { select: { name: true } } },
      });

      if (conflictDriver) {
        const dStart = conflictDriver.startDate.toISOString().split('T')[0];
        const dEnd = conflictDriver.endDate.toISOString().split('T')[0];
        throw new ApiConflictException(
          ErrorCode.BAD_REQUEST,
          `Driver "${dto.driverName || 'Selected Driver'}" is already scheduled on vehicle "${conflictDriver.vehicle?.name || 'another bus'}" from ${dStart} to ${dEnd}.`,
        );
      }
    }

    // ── Calculate Financials & Duration ─────────────────────────
    const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const calculatedTotal = dto.totalAmount ?? (dto.ratePerDay ? dto.ratePerDay * diffDays : 0);

    let invoiceId: string | undefined = dto.invoiceId;
    let invoiceNumber: string | undefined = dto.invoiceNumber;
    let quoteId: string | undefined = dto.quoteId;
    let quoteNumber: string | undefined = dto.quoteNumber;

    // ── Auto-generate Official Invoice if requested or amount provided ───
    if (dto.createInvoice !== false && calculatedTotal > 0 && !invoiceId) {
      try {
        const inv = await this.invoicesService.create({
          customerId: dto.customerId,
          amount: calculatedTotal,
          currency: dto.currency || 'GHS',
          issueDate: start.toISOString(),
          dueDate: end.toISOString(),
          notes: `Charter Rental: ${vehicle.name} for ${dto.company}${dto.destination ? ` to ${dto.destination}` : ''} (${diffDays} days)`,
          items: [
            {
              description: `${vehicle.name} Charter - ${dto.destination || 'Rental'} (${dto.company})`,
              quantity: diffDays,
              unitPrice: dto.ratePerDay || Math.round(calculatedTotal / diffDays),
              total: calculatedTotal,
            },
          ],
        } as any, ctx);

        invoiceId = inv.id;
        invoiceNumber = inv.invoiceNumber;

        // If marked as paid, record payment & mark invoice paid
        if (dto.paymentStatus === 'PAID') {
          await this.prisma.payment.create({
            data: {
              paymentNumber: `PAY-${inv.invoiceNumber}`,
              receiptNumber: `RCT-${inv.invoiceNumber}`,
              invoiceId: inv.id,
              customerId: dto.customerId,
              amount: calculatedTotal,
              currency: dto.currency || 'GHS',
              method: 'BANK_TRANSFER' as any,
              status: 'COMPLETED' as any,
              paidAt: new Date(),
            },
          });
          await (this.prisma as any).invoice.update({
            where: { id: inv.id },
            data: { status: InvoiceStatus.PAID, amountPaid: calculatedTotal },
          });
        }
      } catch (invErr) {
        console.error('Invoice auto-generation notice:', invErr);
      }
    }

    // ── Auto-generate Quotation if requested or amount provided ───
    if (dto.createQuote !== false && calculatedTotal > 0 && !quoteId) {
      try {
        const qte = await this.quotesService.create({
          customerId: dto.customerId,
          tourName: `${vehicle.name} Charter - ${dto.destination || 'Rental'} (${dto.company})`,
          totalPrice: calculatedTotal,
          currency: dto.currency || 'GHS',
          validUntil: end.toISOString(),
          notes: `Charter Quotation: ${vehicle.name} for ${dto.company}${dto.destination ? ` to ${dto.destination}` : ''} (${diffDays} days)`,
          items: [
            {
              description: `${vehicle.name} Charter - ${dto.destination || 'Rental'} (${dto.company})`,
              quantity: diffDays,
              unitPrice: dto.ratePerDay || Math.round(calculatedTotal / diffDays),
              total: calculatedTotal,
            },
          ],
        } as any, ctx);

        quoteId = qte.id;
        quoteNumber = qte.quoteNumber;
      } catch (qErr) {
        console.error('Quote auto-generation notice:', qErr);
      }
    }

    const booking = await this.fleetBooking.create({
      data: {
        company:       dto.company,
        destination:   dto.destination,
        startDate:     start,
        endDate:       end,
        vehicleId:     dto.vehicleId,
        driverName:    dto.driverName,
        driverId:      dto.driverId,
        departTime:    dto.departTime,
        paxCount:      dto.paxCount,
        notes:         dto.notes,
        color:         dto.color,
        ratePerDay:    dto.ratePerDay,
        totalAmount:   calculatedTotal > 0 ? calculatedTotal : undefined,
        currency:      dto.currency || 'GHS',
        invoiceId:     invoiceId,
        invoiceNumber: invoiceNumber,
        quoteId:       quoteId,
        quoteNumber:   quoteNumber,
        customerId:    dto.customerId,
        paymentStatus: dto.paymentStatus || 'UNPAID',
        createdById:   ctx.userId,
      },
      include: { vehicle: { select: { id: true, name: true, registrationNo: true } } },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.BOOKING_CREATED,
      entityType: 'FleetBooking',
      entityId: booking.id,
      after: { company: booking.company, vehicleId: booking.vehicleId, invoiceNumber, quoteNumber },
      ipAddress: ctx.ipAddress,
      userAgent:  ctx.userAgent,
      requestId:  ctx.requestId,
    });

    return booking;
  }

  async findAll(params: FleetListParams) {
    const where: Record<string, unknown> = {};
    if (params.vehicleId) where.vehicleId = params.vehicleId;
    if (params.customerId) where.customerId = params.customerId;
    if (params.from || params.to) {
      where.AND = [
        ...(params.from ? [{ endDate:   { gte: new Date(params.from) } }] : []),
        ...(params.to   ? [{ startDate: { lte: new Date(params.to)   } }] : []),
      ];
    }

    const [items, total] = await Promise.all([
      this.fleetBooking.findMany({
        where,
        skip:     (params.page - 1) * params.limit,
        take:     params.limit,
        orderBy:  { startDate: 'asc' },
        include:  { vehicle: { select: { id: true, name: true, registrationNo: true } } },
      }),
      this.fleetBooking.count({ where }),
    ]);

    return { items, total, page: params.page, limit: params.limit, totalPages: Math.ceil(total / params.limit), paginated: true as const };
  }

  async findById(id: string) {
    const b = await this.fleetBooking.findUnique({
      where: { id },
      include: { vehicle: { select: { id: true, name: true, registrationNo: true } } },
    });
    if (!b) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Fleet booking not found');
    return b;
  }

  async update(id: string, dto: UpdateFleetBookingDto, ctx: RequestContext) {
    const existing = await this.fleetBooking.findUnique({ where: { id } });
    if (!existing) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Fleet booking not found');

    const start = dto.startDate ? new Date(dto.startDate) : existing.startDate;
    const end   = dto.endDate   ? new Date(dto.endDate)   : existing.endDate;
    if (end < start) throw new ApiConflictException(ErrorCode.BAD_REQUEST, 'endDate must be on or after startDate');

    const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const updatedRate = dto.ratePerDay !== undefined ? dto.ratePerDay : existing.ratePerDay;
    const calculatedTotal = dto.totalAmount !== undefined
      ? dto.totalAmount
      : (updatedRate ? updatedRate * diffDays : existing.totalAmount);

    const updated = await this.fleetBooking.update({
      where: { id },
      data: {
        company:       dto.company,
        destination:   dto.destination,
        startDate:     dto.startDate ? start : undefined,
        endDate:       dto.endDate   ? end   : undefined,
        vehicleId:     dto.vehicleId,
        driverName:    dto.driverName,
        driverId:      dto.driverId,
        departTime:    dto.departTime,
        paxCount:      dto.paxCount,
        notes:         dto.notes,
        color:         dto.color !== undefined ? dto.color : existing.color,
        ratePerDay:    updatedRate,
        totalAmount:   calculatedTotal,
        currency:      dto.currency !== undefined ? dto.currency : existing.currency,
        paymentStatus: dto.paymentStatus !== undefined ? dto.paymentStatus : existing.paymentStatus,
        quoteId:       dto.quoteId !== undefined ? dto.quoteId : existing.quoteId,
        quoteNumber:   dto.quoteNumber !== undefined ? dto.quoteNumber : existing.quoteNumber,
        invoiceId:     dto.invoiceId !== undefined ? dto.invoiceId : existing.invoiceId,
        invoiceNumber: dto.invoiceNumber !== undefined ? dto.invoiceNumber : existing.invoiceNumber,
        customerId:    dto.customerId !== undefined ? dto.customerId : existing.customerId,
      },
      include: { vehicle: { select: { id: true, name: true, registrationNo: true } } },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.BOOKING_UPDATED,
      entityType: 'FleetBooking',
      entityId: id,
      before: { company: existing.company },
      after:  { company: updated.company },
      ipAddress: ctx.ipAddress,
      userAgent:  ctx.userAgent,
      requestId:  ctx.requestId,
    });

    return updated;
  }

  async remove(id: string, ctx: RequestContext) {
    const existing = await this.fleetBooking.findUnique({ where: { id } });
    if (!existing) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Fleet booking not found');

    await this.fleetBooking.delete({ where: { id } });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.BOOKING_DELETED,
      entityType: 'FleetBooking',
      entityId: id,
      before: { company: existing.company },
      ipAddress: ctx.ipAddress,
      userAgent:  ctx.userAgent,
      requestId:  ctx.requestId,
    });

    return { success: true };
  }

  async getSummary(year: number, month: number) {
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0, 23, 59, 59);
    const today = new Date();

    const [totalVehicles, totalDrivers, monthBookings, todayActiveBookings] = await Promise.all([
      this.prisma.vehicle.count({ where: { isActive: true } }),
      this.prisma.driver.count({ where: { isActive: true } }),
      this.fleetBooking.findMany({
        where: {
          AND: [
            { endDate:   { gte: from } },
            { startDate: { lte: to } },
          ],
        },
        select: {
          id: true,
          vehicleId: true,
          startDate: true,
          endDate: true,
          totalAmount: true,
          paymentStatus: true,
        },
      }),
      this.fleetBooking.findMany({
        where: {
          AND: [
            { startDate: { lte: today } },
            { endDate:   { gte: today } },
          ],
        },
        select: { vehicleId: true, driverName: true },
      }),
    ]);

    const activeBusesToday = new Set(todayActiveBookings.map((b: any) => b.vehicleId)).size;
    const activeDriversToday = new Set(todayActiveBookings.map((b: any) => b.driverName).filter(Boolean)).size;

    const totalRevenue = monthBookings.reduce((sum: number, b: any) => sum + (Number(b.totalAmount) || 0), 0);
    const paidRevenue = monthBookings
      .filter((b: any) => b.paymentStatus === 'PAID')
      .reduce((sum: number, b: any) => sum + (Number(b.totalAmount) || 0), 0);

    const daysInCurrentMonth = new Date(year, month, 0).getDate();
    const totalFleetDays = Math.max(1, totalVehicles * daysInCurrentMonth);

    // Sum booked days for this month
    let bookedDaysCount = 0;
    for (const b of monthBookings) {
      const s = Math.max(from.getTime(), new Date(b.startDate).getTime());
      const e = Math.min(to.getTime(), new Date(b.endDate).getTime());
      if (e >= s) {
        bookedDaysCount += Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
      }
    }
    const utilizationRate = Math.min(100, Math.round((bookedDaysCount / totalFleetDays) * 100));

    return {
      year,
      month,
      totalVehicles,
      totalDrivers,
      activeBusesToday,
      activeDriversToday,
      standbyBusesToday: Math.max(0, totalVehicles - activeBusesToday),
      monthBookingsCount: monthBookings.length,
      monthRevenue: totalRevenue,
      paidRevenue,
      utilizationRate,
    };
  }
}
