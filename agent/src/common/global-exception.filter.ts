import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { AppResponse } from './app-response';
import { API_ERROR_CODES, AppException } from './app-exception';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly _logger = new Logger(GlobalExceptionFilter.name);

  catch(error: unknown, host: ArgumentsHost) {
    // Не HTTP (дії `@Bot`): відповідати нікуди, помилку отримує той, хто викликав роутер.
    if (host.getType() !== 'http') throw error;
    const res = host.switchToHttp().getResponse<Response>();
    if (error instanceof AppException) {
      res.status(error.status).json(AppResponse.fail(error.innerCode, error.message, error.next));
      return;
    }
    if (error instanceof HttpException) {
      res.status(error.getStatus()).json(AppResponse.fail(API_ERROR_CODES.internal, error.message));
      return;
    }
    this._logger.error(error instanceof Error ? error.stack : String(error));
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(AppResponse.fail(API_ERROR_CODES.internal, 'Internal error'));
  }
}
