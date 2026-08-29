import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { ApiForbiddenException } from '../errors';
import { ErrorCode } from '../errors';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      throw new ApiForbiddenException(ErrorCode.PERMISSION_DENIED, 'Permission denied');
    }

    // SuperAdmin implicitly passes all permission checks.
    if (user.roles?.includes('SUPER_ADMIN')) return true;

    const hasAll = required.every((perm) => user.permissions?.includes(perm));
    if (!hasAll) {
      throw new ApiForbiddenException(ErrorCode.PERMISSION_DENIED, 'Permission denied');
    }
    return true;
  }
}
