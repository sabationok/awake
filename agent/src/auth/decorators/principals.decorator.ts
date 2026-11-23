import { SetMetadata } from '@nestjs/common';
import type { PrincipalKind } from '../types/principal.types';

export const PRINCIPALS = 'principals';
/** Кому відкритий роут. Без декоратора — `DEFAULT_PRINCIPALS`; `web-device` треба називати явно. */
export const Principals = (...kinds: PrincipalKind[]) => SetMetadata(PRINCIPALS, kinds);
export const DEFAULT_PRINCIPALS: PrincipalKind[] = ['agent', 'device', 'web'];
