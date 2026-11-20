import { Module } from '@nestjs/common';
import { DevicesModule } from '../devices/devices.module';
import { PresenceListener } from './presence.listener';
import { PresenceService } from './services/presence.service';
import { UpstashClient } from './services/upstash.client';
import { UiSyncService } from './services/ui-sync.service';

@Module({ imports: [DevicesModule], providers: [UpstashClient, PresenceService, UiSyncService, PresenceListener] })
export class PresenceModule {}
