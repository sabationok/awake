import { Global, Module } from '@nestjs/common';
import { MacController } from './mac.controller';
import { MacHelperService } from '../mac-helper/mac-helper.service';
import { OwnerAuthService } from '../mac-helper/services/owner-auth.service';
import { MacAppChannelService } from './services/mac-app-channel.service';
import { MacBridgeService } from './services/mac-bridge.service';

@Global()
@Module({ controllers: [MacController], providers: [MacBridgeService, MacHelperService, MacAppChannelService, OwnerAuthService], exports: [MacBridgeService, MacHelperService, OwnerAuthService] })
export class MacBridgeModule {}
