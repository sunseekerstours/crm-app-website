import { Module } from '@nestjs/common';
import { HrEmployeeController } from './hr-employee.controller';
import { HrPerformanceController } from './hr-performance.controller';
import { HrLeaveController } from './hr-leave.controller';
import { HrEmployeeService } from './hr-employee.service';
import { HrPerformanceService } from './hr-performance.service';
import { HrLeaveService } from './hr-leave.service';

@Module({
  controllers: [HrEmployeeController, HrPerformanceController, HrLeaveController],
  providers: [HrEmployeeService, HrPerformanceService, HrLeaveService],
  exports: [HrEmployeeService, HrPerformanceService, HrLeaveService],
})
export class HrModule {}
