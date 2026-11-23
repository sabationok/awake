import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthContext, AuthedRequest } from '../types/principal.types';

/** Що guard визначив для цього запиту: стратегія і principal. */
export const CurrentAuth = createParamDecorator(
  (_: unknown, context: ExecutionContext): AuthContext => context.switchToHttp().getRequest<AuthedRequest>().auth ?? { strategy: 'local', principal: null },
);
