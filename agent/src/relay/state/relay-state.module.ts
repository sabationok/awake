import { Global, Module } from '@nestjs/common';
import { RelayStateService } from './relay-state.service';

/** Глобальний: стан relay потрібен і реєстру модулів, і Telegram, і host-у. */
@Global()
@Module({ providers: [RelayStateService], exports: [RelayStateService] })
export class RelayStateModule {}
