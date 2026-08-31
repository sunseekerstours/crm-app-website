import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { toRequestContext } from '@app/common/request-context';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { HrEmployeeService } from './hr-employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeListQueryDto } from './dto/employee-list-query.dto';

@ApiTags('hr-employees')
@Controller('employees')
export class HrEmployeeController {
  constructor(private readonly employeeService: HrEmployeeService) {}

  @Post()
  @RequirePermissions(Permission.EMPLOYEE_CREATE)
  create(@Body() dto: CreateEmployeeDto, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.employeeService.create(dto, toRequestContext(req, userId));
  }

  @Get()
  @RequirePermissions(Permission.EMPLOYEE_VIEW)
  findAll(@Query() query: EmployeeListQueryDto) {
    return this.employeeService.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      employmentStatus: query.employmentStatus,
      department: query.department,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.EMPLOYEE_VIEW)
  findById(@Param('id') id: string) {
    return this.employeeService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.EMPLOYEE_UPDATE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.employeeService.update(id, dto, toRequestContext(req, userId));
  }

  @Delete(':id')
  @RequirePermissions(Permission.EMPLOYEE_DELETE)
  remove(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.employeeService.remove(id, toRequestContext(req, userId));
  }
}
