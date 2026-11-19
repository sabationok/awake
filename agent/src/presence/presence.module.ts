import { Module } from '@nestjs/common';
import { PresenceListener } from './presence.listener';
import { PresenceService } from './services/presence.service';
import { UpstashClient } from './services/upstash.client';

@Module({ providers: [UpstashClient, PresenceService, PresenceListener] })
export class PresenceModule {}
