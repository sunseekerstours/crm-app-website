import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';
import { TimelineService } from '@app/modules/timeline/timeline.service';
import { ApiNotFoundException, ErrorCode } from '@app/common/errors';
import { RequestContext } from '@app/common/request-context';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { NoteListQueryDto } from './dto/note-list-query.dto';
import { Prisma, AuditableAction } from '@prisma/client';

@Injectable()
export class NotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly timeline: TimelineService,
  ) {}

  async create(
    dto: CreateNoteDto,
    target: { entityType: 'CUSTOMER' | 'LEAD' | 'DEAL'; entityId: string },
    ctx: RequestContext,
  ) {
    const data: Prisma.NoteCreateInput = {
      content: dto.content,
      createdBy: ctx.userId ? { connect: { id: ctx.userId } } : undefined,
    };

    switch (target.entityType) {
      case 'CUSTOMER':
        data.customer = { connect: { id: target.entityId } };
        break;
      case 'LEAD':
        data.lead = { connect: { id: target.entityId } };
        break;
      case 'DEAL':
        data.deal = { connect: { id: target.entityId } };
        break;
    }

    const note = await this.prisma.note.create({ data });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.NOTE_CREATED,
      entityType: 'Note',
      entityId: note.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    await this.timeline.record({
      entityType: target.entityType,
      entityId: target.entityId,
      type: 'note.created',
      title: 'Note added',
      actorId: ctx.userId,
      data: { noteId: note.id },
    });

    return note;
  }

  async findAll(params: NoteListQueryDto) {
    const where: Prisma.NoteWhereInput = {};
    if (params.customerId) where.customerId = params.customerId;
    if (params.leadId) where.leadId = params.leadId;
    if (params.dealId) where.dealId = params.dealId;

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    const [items, total] = await Promise.all([
      this.prisma.note.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.note.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      paginated: true as const,
    };
  }

  async update(id: string, dto: UpdateNoteDto, ctx: RequestContext) {
    const existing = await this.prisma.note.findUnique({ where: { id } });
    if (!existing) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Note not found');

    const updated = await this.prisma.note.update({
      where: { id },
      data: { content: dto.content },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.NOTE_UPDATED,
      entityType: 'Note',
      entityId: id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return updated;
  }

  async remove(id: string, ctx: RequestContext) {
    const existing = await this.prisma.note.findUnique({ where: { id } });
    if (!existing) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Note not found');

    await this.prisma.note.delete({ where: { id } });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.NOTE_DELETED,
      entityType: 'Note',
      entityId: id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return { success: true };
  }
}
