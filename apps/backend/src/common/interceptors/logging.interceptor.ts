import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const start = Date.now();
    return next.handle().pipe(
      tap({
        next: () => this.logger.log(`${method} ${url} ${Date.now() - start}ms`),
        error: (err) => this.logger.error(`${method} ${url} ${Date.now() - start}ms`, err?.stack),
      }),
    );
  }
}
