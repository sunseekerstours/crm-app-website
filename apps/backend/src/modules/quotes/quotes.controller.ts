import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { toRequestContext } from '@app/common/request-context';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { QuoteListQueryDto } from './dto/quote-list-query.dto';

@ApiTags('quotes')
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  @RequirePermissions(Permission.QUOTE_CREATE)
  create(@Body() dto: CreateQuoteDto, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.quotesService.create(dto, toRequestContext(req, userId));
  }

  @Get()
  @RequirePermissions(Permission.QUOTE_VIEW)
  findAll(@Query() query: QuoteListQueryDto) {
    return this.quotesService.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      customerId: query.customerId,
      status: query.status,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.QUOTE_VIEW)
  findById(@Param('id') id: string) {
    return this.quotesService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.QUOTE_UPDATE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateQuoteDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.quotesService.update(id, dto, toRequestContext(req, userId));
  }

  @Post(':id/accept')
  @RequirePermissions(Permission.QUOTE_UPDATE)
  accept(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.quotesService.accept(id, toRequestContext(req, userId));
  }

  @Post(':id/convert')
  @RequirePermissions(Permission.QUOTE_UPDATE)
  convert(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.quotesService.convert(id, toRequestContext(req, userId));
  }

  @Delete(':id')
  @RequirePermissions(Permission.QUOTE_UPDATE)
  remove(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.quotesService.remove(id, toRequestContext(req, userId));
  }
}
