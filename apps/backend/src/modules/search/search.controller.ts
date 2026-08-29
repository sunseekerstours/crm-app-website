import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { SearchService } from './search.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @RequirePermissions(Permission.SEARCH)
  search(@Query('q') q?: string, @Query('limit') limit?: string) {
    const l = limit ? Math.min(parseInt(limit, 10) || 10, 25) : 10;
    return this.searchService.search(q ?? '', l);
  }
}
