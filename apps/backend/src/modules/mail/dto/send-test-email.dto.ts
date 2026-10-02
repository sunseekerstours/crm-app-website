import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class SendTestEmailDto {
  @ApiProperty({ description: 'Destination email address for test message', example: 'admin@sunseekerstours.com' })
  @IsEmail()
  @IsNotEmpty()
  to!: string;
}
