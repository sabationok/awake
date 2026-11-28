import { Module } from '@nestjs/common';
import { AppStateModule } from '../app-state';
import { PresenceListener } from './presence.listener';
import { UpstashClient } from './services/upstash.client';
import { UiSyncService } from './services/ui-sync.service';

@Module({ imports: [AppStateModule], providers: [UpstashClient, UiSyncService, PresenceListener] })
export class PresenceModule {}
