import { Body, Controller, Get, HttpCode, HttpStatus, Ip, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '@app/common/decorators/public.decorator';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { CompletePasswordResetDto } from './dto/complete-password-reset.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private meta(@Req() req: Request, @Ip() ip: string) {
    return {
      ipAddress: ip,
      userAgent: req.headers['user-agent'],
      requestId: (req as any).requestId,
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Req() req: Request, @Ip() ip: string) {
    return this.authService.login(dto, this.meta(req, ip));
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request, @Ip() ip: string) {
    return this.authService.refresh(dto.refreshToken, this.meta(req, ip));
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Body() dto: RefreshTokenDto, @Req() req: Request, @Ip() ip: string) {
    return this.authService.logout(dto.refreshToken, this.meta(req, ip));
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  logoutAll(@CurrentUser('id') userId: string, @Req() req: Request, @Ip() ip: string) {
    return this.authService.logoutAllForUser(userId, this.meta(req, ip));
  }

  @Public()
  @Post('password-reset/request')
  @HttpCode(HttpStatus.OK)
  requestPasswordReset(
    @Body() dto: RequestPasswordResetDto,
    @Req() req: Request,
    @Ip() ip: string,
  ) {
    return this.authService.requestPasswordReset(dto.email, this.meta(req, ip));
  }

  @Public()
  @Post('password-reset/complete')
  @HttpCode(HttpStatus.OK)
  completePasswordReset(
    @Body() dto: CompletePasswordResetDto,
    @Req() req: Request,
    @Ip() ip: string,
  ) {
    return this.authService.completePasswordReset(dto, this.meta(req, ip));
  }

  @Get('me')
  me(@CurrentUser('id') userId: string) {
    return this.authService.me(userId);
  }
}
