import { Module } from '@nestjs/common';
import { RelayHostService } from './services/relay-host';
import { RelayHostListener } from './services/relay-host/relay-host.listener';

/** Host relay. ModulesModule і RelayStateModule глобальні. */
@Module({ providers: [RelayHostService, RelayHostListener] })
export class RelayModule {}
