import { IsOptional, IsString } from 'class-validator';

export class CreateNoteDto {
  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  dealId?: string;
}
