import { Module } from '@nestjs/common';
import { PresenceListener } from './presence.listener';
import { UpstashClient } from './services/upstash.client';
import { UiSyncService } from './services/ui-sync.service';

@Module({ providers: [UpstashClient, UiSyncService, PresenceListener] })
export class PresenceModule {}
