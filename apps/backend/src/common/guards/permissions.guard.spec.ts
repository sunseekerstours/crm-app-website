import { PermissionsGuard } from './permissions.guard';
import { Reflector } from '@nestjs/core';

function makeCtx(user: unknown) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as any;
}

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;

  beforeEach(() => {
    const reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
  });

  it('allows when no permissions are required', () => {
    const ctx = makeCtx({});
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows SUPER_ADMIN regardless of the required permission', () => {
    const ctx = makeCtx({ roles: ['SUPER_ADMIN'], permissions: [] });
    Reflector.prototype.getAllAndOverride = jest.fn().mockReturnValue(['customers.view']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows a user who holds the required permission', () => {
    Reflector.prototype.getAllAndOverride = jest.fn().mockReturnValue(['customers.view']);
    const ctx = makeCtx({
      roles: ['SALES_AGENT'],
      permissions: ['customers.view', 'leads.create'],
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws FORBIDDEN when a permission is missing', () => {
    Reflector.prototype.getAllAndOverride = jest.fn().mockReturnValue(['customers.delete']);
    const ctx = makeCtx({ roles: ['SALES_AGENT'], permissions: ['customers.view'] });
    expect(() => guard.canActivate(ctx)).toThrow();
  });

  it('throws FORBIDDEN when there is no user', () => {
    Reflector.prototype.getAllAndOverride = jest.fn().mockReturnValue(['customers.view']);
    const ctx = makeCtx(undefined);
    expect(() => guard.canActivate(ctx)).toThrow();
  });
});
