import { Module } from '@nestjs/common';
import { DevicesModule } from '../devices/devices.module';
import { PresenceListener } from './presence.listener';
import { PresenceService } from './services/presence.service';
import { UpstashClient } from './services/upstash.client';

@Module({ imports: [DevicesModule], providers: [UpstashClient, PresenceService, PresenceListener] })
export class PresenceModule {}
