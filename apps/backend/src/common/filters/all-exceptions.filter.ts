import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: {
    requestId: string;
  };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    const requestId =
      request?.requestId ?? (request?.headers?.['x-request-id'] as string) ?? uuidv4();

    let status: number;
    let code: string;
    let message: string;
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
        code = this.codeFromStatus(status);
      } else if (res && typeof res === 'object') {
        const obj = res as Record<string, unknown>;
        message = (obj.message as string) ?? exception.message;
        details = obj.message;
        code = (obj.code as string) ?? this.codeFromStatus(status);
      } else {
        message = exception.message;
        code = this.codeFromStatus(status);
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 'INTERNAL_ERROR';
      message = 'An unexpected error occurred';
      this.logger.error(`Unhandled exception`, (exception as Error)?.stack, {
        requestId,
        path: request?.url,
      });
    }

    response.setHeader('x-request-id', requestId);
    const body: ApiErrorBody = {
      error: { code, message, ...(details !== undefined ? { details } : {}) },
      meta: { requestId },
    };
    response.status(status).json(body);
  }

  private codeFromStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMITED';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'VALIDATION_ERROR';
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return 'INTERNAL_ERROR';
      default:
        return `HTTP_${status}`;
    }
  }
}
