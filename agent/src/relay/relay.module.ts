import { Module } from '@nestjs/common';
import { RelayEventsListener } from './listeners/relay-events.listener';
import { RelayHostService } from './services/relay-host';
import { RelayHostListener } from './services/relay-host/relay-host.listener';

/** Webhooxy: host relay і його сповіщення. ModulesModule, RelayStateModule і реєстри глобальні. */
@Module({ providers: [RelayHostService, RelayHostListener, RelayEventsListener] })
export class RelayModule {}
