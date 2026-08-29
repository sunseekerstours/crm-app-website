import { Injectable } from '@nestjs/common';
import { RequestContext } from '@app/common/request-context';
import { ApiNotFoundException, ErrorCode } from '@app/common/errors';
import { AuditService } from '@app/modules/audit/audit.service';
import { CreateTripAssignmentDto } from './dto/create-trip-assignment.dto';
import { UpdateTripAssignmentDto } from './dto/update-trip-assignment.dto';
import { PrismaService } from '@app/prisma/prisma.service';
import { AuditableAction } from '@prisma/client';

@Injectable()
export class TripsService {
  private readonly entityType = 'Departure';

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async ensureDeparture(departureId: string) {
    const departure = await this.prisma.departure.findUnique({ where: { id: departureId } });
    if (!departure)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Departure not found');
    return departure;
  }

  async createAssignment(departureId: string, dto: CreateTripAssignmentDto, ctx: RequestContext) {
    await this.ensureDeparture(departureId);

    const assignment = await this.prisma.tripAssignment.create({
      data: {
        departureId,
        dayNumber: dto.dayNumber,
        guideId: dto.guideId,
        hotelId: dto.hotelId,
        vehicleId: dto.vehicleId,
        notes: dto.notes,
      },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.TRIP_ASSIGNED,
      entityType: this.entityType,
      entityId: departureId,
      after: {
        assignmentId: assignment.id,
        dayNumber: dto.dayNumber,
        guideId: dto.guideId,
        hotelId: dto.hotelId,
        vehicleId: dto.vehicleId,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return assignment;
  }

  async findAllAssignments(departureId: string) {
    await this.ensureDeparture(departureId);
    return this.prisma.tripAssignment.findMany({
      where: { departureId },
      orderBy: [{ dayNumber: 'asc' }, { createdAt: 'asc' }],
      include: {
        guide: { select: { id: true, firstName: true, lastName: true } },
        hotel: { select: { id: true, name: true } },
        vehicle: { select: { id: true, name: true, registrationNo: true } },
      },
    });
  }

  async updateAssignment(id: string, dto: UpdateTripAssignmentDto, ctx: RequestContext) {
    const existing = await this.prisma.tripAssignment.findUnique({ where: { id } });
    if (!existing)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Assignment not found');

    const assignment = await this.prisma.tripAssignment.update({
      where: { id },
      data: {
        dayNumber: dto.dayNumber,
        guideId: dto.guideId,
        hotelId: dto.hotelId,
        vehicleId: dto.vehicleId,
        notes: dto.notes,
      },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.TRIP_ASSIGNED,
      entityType: this.entityType,
      entityId: existing.departureId,
      after: { assignmentId: id, ...dto },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return assignment;
  }

  async removeAssignment(id: string, ctx: RequestContext) {
    const existing = await this.prisma.tripAssignment.findUnique({ where: { id } });
    if (!existing)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Assignment not found');

    await this.prisma.tripAssignment.delete({ where: { id } });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.TRIP_UNASSIGNED,
      entityType: this.entityType,
      entityId: existing.departureId,
      before: { assignmentId: id },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return { success: true };
  }

  async getBoard(departureId: string) {
    const departure = await this.prisma.departure.findUnique({
      where: { id: departureId },
      include: {
        tour: { select: { id: true, name: true } },
      },
    });
    if (!departure)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Departure not found');

    const [assignments, checklists, bookings, guideCount, hotelCount, vehicleCount] =
      await Promise.all([
        this.prisma.tripAssignment.findMany({
          where: { departureId },
          orderBy: [{ dayNumber: 'asc' }, { createdAt: 'asc' }],
          include: {
            guide: { select: { id: true, firstName: true, lastName: true } },
            hotel: { select: { id: true, name: true } },
            vehicle: { select: { id: true, name: true, registrationNo: true } },
          },
        }),
        this.prisma.checklistItem.findMany({
          where: { departureId },
          orderBy: { sortOrder: 'asc' },
        }),
        this.prisma.booking.findMany({
          where: { departureId, status: { not: 'CANCELLED' } },
          select: {
            id: true,
            bookingNumber: true,
            status: true,
            paxCount: true,
            customer: { select: { id: true, firstName: true, lastName: true } },
          },
        }),
        this.prisma.tripAssignment.count({ where: { departureId, guideId: { not: null } } }),
        this.prisma.tripAssignment.count({ where: { departureId, hotelId: { not: null } } }),
        this.prisma.tripAssignment.count({ where: { departureId, vehicleId: { not: null } } }),
      ]);

    const totalPax = bookings.reduce((sum, b) => sum + b.paxCount, 0);
    const completedChecklist = checklists.filter((c) => c.isCompleted).length;

    return {
      departure: {
        id: departure.id,
        startDate: departure.startDate,
        endDate: departure.endDate,
        tour: departure.tour,
        bookedCount: departure.bookedCount,
        maxPax: departure.maxPax,
        availableSeats: (departure.maxPax ?? 0) - departure.bookedCount,
        totalPax,
        bookingCount: bookings.length,
      },
      resources: {
        guidesAssigned: guideCount,
        hotelsAssigned: hotelCount,
        vehiclesAssigned: vehicleCount,
      },
      assignments,
      checklists: {
        items: checklists,
        total: checklists.length,
        completed: completedChecklist,
      },
      bookings,
    };
  }
}
