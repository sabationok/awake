import { Global, Module } from '@nestjs/common';
import { MacController } from './mac.controller';
import { MacBridgeService } from './services/mac-bridge.service';

@Global()
@Module({ controllers: [MacController], providers: [MacBridgeService], exports: [MacBridgeService] })
export class MacBridgeModule {}
