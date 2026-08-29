import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface StandardResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, StandardResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<StandardResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const requestId = request.headers['x-request-id'] ?? uuidv4();
    request.requestId = requestId;
    if (typeof request.res?.setHeader === 'function') {
      request.res.setHeader('x-request-id', requestId);
    }
    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object' && 'paginated' in data) {
          const { paginated, ...rest } = data as Record<string, unknown>;
          return {
            data: rest,
            meta: { ...(paginated as Record<string, unknown>), requestId },
          } as unknown as StandardResponse<T>;
        }
        return { data, meta: { requestId } } as StandardResponse<T>;
      }),
    );
  }
}
