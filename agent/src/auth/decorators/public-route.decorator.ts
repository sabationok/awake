import { SetMetadata } from '@nestjs/common';

export const PUBLIC_ROUTE = 'publicRoute';
/** Маршрут без токена. Перевірку довіреної мережі гард робить усе одно. */
export const PublicRoute = () => SetMetadata(PUBLIC_ROUTE, true);
