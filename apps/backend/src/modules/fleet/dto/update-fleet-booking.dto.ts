import { PartialType } from '@nestjs/mapped-types';
import { CreateFleetBookingDto } from './create-fleet-booking.dto';

export class UpdateFleetBookingDto extends PartialType(CreateFleetBookingDto) {}
