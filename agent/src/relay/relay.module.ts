import { Module } from '@nestjs/common';
import { DevicesModule } from '../devices/devices.module';
import { RelayEventsListener } from './listeners/relay-events.listener';
import { RelayHostService } from './services/relay-host';
import { RelayRequestService } from './services/relay-request';
import { RelayHostListener } from './services/relay-host/relay-host.listener';

/** Webhooxy: host relay і його сповіщення. ModulesModule, RelayStateModule і реєстри глобальні. */
@Module({ imports: [DevicesModule], providers: [RelayHostService, RelayRequestService, RelayHostListener, RelayEventsListener] })
export class RelayModule {}
