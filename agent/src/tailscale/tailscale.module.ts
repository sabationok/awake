import { Global, Module } from '@nestjs/common';
import { DevicesModule } from '../devices/devices.module';
import { TailscaleEventsListener } from './listeners/tailscale-events.listener';
import { TailscaleListener, TailscaleService } from './services/tailscale';

/** Tailscale: стан tailnet, `tailscale serve` і його сповіщення. Глобальний: його читають гард, пристрої і модуль MaControl. */
@Global()
@Module({ imports: [DevicesModule], providers: [TailscaleService, TailscaleListener, TailscaleEventsListener], exports: [TailscaleService] })
export class TailscaleModule {}
