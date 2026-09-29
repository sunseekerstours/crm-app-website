import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class SetRolePermissionsDto {
  @ApiProperty({ example: ['bookings.view', 'bookings.create'], isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  permissionKeys!: string[];
}
