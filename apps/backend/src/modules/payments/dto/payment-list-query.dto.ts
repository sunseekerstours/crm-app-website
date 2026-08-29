import { IsOptional, IsString } from 'class-validator';
import { ListQueryDto } from '@app/common/dto/list-query.dto';

export class PaymentListQueryDto extends ListQueryDto {
  @IsOptional()
  @IsString()
  bookingId?: string;

  @IsOptional()
  @IsString()
  invoiceId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
