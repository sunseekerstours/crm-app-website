import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { NotificationListQueryDto } from './dto/notification-list-query.dto';
import { UpdatePreferenceDto } from './dto/update-preference.dto';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @RequirePermissions(Permission.NOTIFICATION_VIEW)
  findAll(@CurrentUser('id') userId: string, @Query() query: NotificationListQueryDto) {
    return this.notificationsService.listForUser(userId, {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      unreadOnly: query.unreadOnly,
    });
  }

  @Get('unread-count')
  @RequirePermissions(Permission.NOTIFICATION_VIEW)
  unreadCount(@CurrentUser('id') userId: string) {
    return this.notificationsService.unreadCount(userId);
  }

  @Get('preferences')
  @RequirePermissions(Permission.NOTIFICATION_VIEW)
  getPrefs(@CurrentUser('id') userId: string) {
    return this.notificationsService.getPrefs(userId);
  }

  @Patch('preferences')
  @RequirePermissions(Permission.NOTIFICATION_MANAGE)
  updatePrefs(@CurrentUser('id') userId: string, @Body() dto: UpdatePreferenceDto) {
    return this.notificationsService.updatePrefs(userId, dto);
  }

  @Patch(':id/read')
  @RequirePermissions(Permission.NOTIFICATION_MANAGE)
  markRead(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.notificationsService.markRead(userId, id);
  }

  @Post('read-all')
  @RequirePermissions(Permission.NOTIFICATION_MANAGE)
  markAllRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllRead(userId);
  }
}
