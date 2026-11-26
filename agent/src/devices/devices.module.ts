import { Module } from '@nestjs/common';
import { WebAuthModule } from '../web-auth/web-auth.module';
import { DevicesController } from './devices.controller';
import { DevicesRepository } from './repositories/devices.repository';
import { DevicesBridgeService } from './services/devices-bridge.service';
import { PairingService } from './services/pairing.service';

@Module({ imports: [WebAuthModule], controllers: [DevicesController], providers: [DevicesRepository, PairingService, DevicesBridgeService], exports: [PairingService, DevicesBridgeService] })
export class DevicesModule {}
