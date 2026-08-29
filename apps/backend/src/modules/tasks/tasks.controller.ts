import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { toRequestContext } from '@app/common/request-context';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskListQueryDto } from './dto/task-list-query.dto';

@ApiTags('tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @RequirePermissions(Permission.TASK_CREATE)
  create(@Body() dto: CreateTaskDto, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.tasksService.create(dto, toRequestContext(req, userId));
  }

  @Get()
  @RequirePermissions(Permission.TASK_VIEW)
  findAll(@Query() query: TaskListQueryDto) {
    return this.tasksService.findAll(query);
  }

  @Get('my-day')
  @RequirePermissions(Permission.TASK_VIEW)
  myDay(@CurrentUser('id') userId: string) {
    return this.tasksService.myDay(userId);
  }

  @Get(':id')
  @RequirePermissions(Permission.TASK_VIEW)
  findById(@Param('id') id: string) {
    return this.tasksService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.TASK_UPDATE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.tasksService.update(id, dto, toRequestContext(req, userId));
  }

  @Delete(':id')
  @RequirePermissions(Permission.TASK_DELETE)
  remove(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.tasksService.remove(id, toRequestContext(req, userId));
  }
}
