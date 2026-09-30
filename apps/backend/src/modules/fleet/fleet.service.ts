import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';
import { ApiNotFoundException, ApiConflictException, ErrorCode } from '@app/common/errors';
import { RequestContext } from '@app/common/request-context';
import { CreateFleetBookingDto } from './dto/create-fleet-booking.dto';
import { UpdateFleetBookingDto } from './dto/update-fleet-booking.dto';
import { AuditableAction } from '@prisma/client';

export interface FleetListParams {
  page: number;
  limit: number;
  vehicleId?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class FleetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
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

    const booking = await this.fleetBooking.create({
      data: {
        company:     dto.company,
        destination: dto.destination,
        startDate:   start,
        endDate:     end,
        vehicleId:   dto.vehicleId,
        driverName:  dto.driverName,
        departTime:  dto.departTime,
        paxCount:    dto.paxCount,
        notes:       dto.notes,
        color:       dto.color,
        createdById: ctx.userId,
      },
      include: { vehicle: { select: { id: true, name: true, registrationNo: true } } },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.BOOKING_CREATED,
      entityType: 'FleetBooking',
      entityId: booking.id,
      after: { company: booking.company, vehicleId: booking.vehicleId },
      ipAddress: ctx.ipAddress,
      userAgent:  ctx.userAgent,
      requestId:  ctx.requestId,
    });

    return booking;
  }

  async findAll(params: FleetListParams) {
    const where: Record<string, unknown> = {};
    if (params.vehicleId) where.vehicleId = params.vehicleId;
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

    const updated = await this.fleetBooking.update({
      where: { id },
      data: {
        company:     dto.company,
        destination: dto.destination,
        startDate:   dto.startDate ? start : undefined,
        endDate:     dto.endDate   ? end   : undefined,
        vehicleId:   dto.vehicleId,
        driverName:  dto.driverName,
        departTime:  dto.departTime,
        paxCount:    dto.paxCount,
        notes:       dto.notes,
        color:       dto.color !== undefined ? dto.color : existing.color,
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
}
