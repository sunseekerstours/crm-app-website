import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';

/** Standard API error codes, matching the PRD response standard. */
export const ErrorCode = {
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  EMAIL_IN_USE: 'EMAIL_IN_USE',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  ROLE_NOT_FOUND: 'ROLE_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  FORBIDDEN: 'FORBIDDEN',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  EMAIL_ALREADY_VERIFIED: 'EMAIL_ALREADY_VERIFIED',
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

export class ApiError<T extends ErrorCodeType = ErrorCodeType> {
  constructor(
    public readonly code: T,
    public readonly message: string,
    public readonly details?: unknown,
  ) {}
}

export class ApiNotFoundException extends NotFoundException {
  constructor(code: ErrorCodeType, message: string) {
    super({ code, message });
  }
}

export class ApiConflictException extends ConflictException {
  constructor(code: ErrorCodeType, message: string) {
    super({ code, message });
  }
}

export class ApiBadRequestException extends BadRequestException {
  constructor(code: ErrorCodeType, message: string, details?: unknown) {
    super({ code, message, details });
  }
}

export class ApiUnauthorizedException extends UnauthorizedException {
  constructor(code: ErrorCodeType, message: string) {
    super({ code, message });
  }
}

export class ApiForbiddenException extends ForbiddenException {
  constructor(code: ErrorCodeType = ErrorCode.FORBIDDEN, message: string) {
    super({ code, message });
  }
}
