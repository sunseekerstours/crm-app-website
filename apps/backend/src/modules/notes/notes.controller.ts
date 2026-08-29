import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { toRequestContext } from '@app/common/request-context';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { NoteListQueryDto } from './dto/note-list-query.dto';

@ApiTags('notes')
@Controller()
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post('customers/:id/notes')
  @RequirePermissions(Permission.NOTE_CREATE)
  createForCustomer(
    @Param('id') id: string,
    @Body() dto: CreateNoteDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.notesService.create(
      dto,
      { entityType: 'CUSTOMER', entityId: id },
      toRequestContext(req, userId),
    );
  }

  @Post('leads/:id/notes')
  @RequirePermissions(Permission.NOTE_CREATE)
  createForLead(
    @Param('id') id: string,
    @Body() dto: CreateNoteDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.notesService.create(
      dto,
      { entityType: 'LEAD', entityId: id },
      toRequestContext(req, userId),
    );
  }

  @Post('deals/:id/notes')
  @RequirePermissions(Permission.NOTE_CREATE)
  createForDeal(
    @Param('id') id: string,
    @Body() dto: CreateNoteDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.notesService.create(
      dto,
      { entityType: 'DEAL', entityId: id },
      toRequestContext(req, userId),
    );
  }

  @Get('notes')
  @RequirePermissions(Permission.NOTE_VIEW)
  findAll(@Query() query: NoteListQueryDto) {
    return this.notesService.findAll(query);
  }

  @Patch('notes/:id')
  @RequirePermissions(Permission.NOTE_UPDATE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateNoteDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.notesService.update(id, dto, toRequestContext(req, userId));
  }

  @Delete('notes/:id')
  @RequirePermissions(Permission.NOTE_DELETE)
  remove(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.notesService.remove(id, toRequestContext(req, userId));
  }
}
