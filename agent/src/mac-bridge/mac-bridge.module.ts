import { Global, Module } from '@nestjs/common';
import { MacController } from './mac.controller';
import { MacHelperService } from '../mac-helper/mac-helper.service';
import { MacBridgeService } from './services/mac-bridge.service';

@Global()
@Module({ controllers: [MacController], providers: [MacBridgeService, MacHelperService], exports: [MacBridgeService, MacHelperService] })
export class MacBridgeModule {}
