import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@app/common/decorators/public.decorator';
import { PublicService } from './public.service';
import { CreatePublicInquiryDto } from './dto/create-public-inquiry.dto';

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Public()
  @Get('tours')
  listTours() {
    return this.publicService.listTours();
  }

  @Public()
  @Get('tours/:slug')
  getTour(@Param('slug') slug: string) {
    return this.publicService.getTourBySlug(slug);
  }

  @Public()
  @Get('destinations')
  listDestinations() {
    return this.publicService.listDestinations();
  }

  @Public()
  @Get('pages')
  listPages() {
    return this.publicService.listPublicPages();
  }

  @Public()
  @Get('pages/:slug')
  getPage(@Param('slug') slug: string) {
    return this.publicService.getPublicPageBySlug(slug);
  }

  @Public()
  @Get('settings')
  listSettings() {
    return this.publicService.listPublicSettings();
  }

  @Public()
  @Get('products')
  listProducts(@Query('category') category?: string) {
    return this.publicService.listProducts(category);
  }

  @Public()
  @Post('inquiries')
  createInquiry(@Body() dto: CreatePublicInquiryDto) {
    return this.publicService.createInquiry(dto);
  }
}
