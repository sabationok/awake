import { Global, Module } from '@nestjs/common';
import { TailscaleListener, TailscaleService } from './services/tailscale';

/** Tailscale: стан tailnet і `tailscale serve`. Глобальний: його читають гард, пристрої і модуль MaControl. */
@Global()
@Module({ providers: [TailscaleService, TailscaleListener], exports: [TailscaleService] })
export class TailscaleModule {}
