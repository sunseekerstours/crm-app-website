import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { PaginationQueryDto } from '@app/common/dto/pagination.dto';
import { AuditService } from './audit.service';

@ApiTags('audit')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions(Permission.AUDIT_VIEW)
  findAll(@Query() query: PaginationQueryDto) {
    return this.auditService.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
  }
}
