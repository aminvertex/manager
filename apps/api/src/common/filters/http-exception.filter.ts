import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'خطای داخلی سرور';
    let code = 'INTERNAL_ERROR';
    let errors: Array<{ field?: string; message: string }> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string) || message;
        code = (resp.code as string) || code;

        if (Array.isArray(resp.message)) {
          errors = (resp.message as string[]).map((msg) => ({ message: msg }));
          message = 'خطای اعتبارسنجی';
          code = 'VALIDATION_ERROR';
        }
      }
    }

    response.status(status).json({
      success: false,
      message,
      code,
      ...(errors && { errors }),
    });
  }
}

export class ApiException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus,
    code?: string,
  ) {
    super({ message, code: code || 'ERROR' }, status);
  }
}
