import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CompletePasswordResetDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}
