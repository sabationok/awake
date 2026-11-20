import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { DevicesRepository } from './repositories/devices.repository';
import { DevicesBridgeService } from './services/devices-bridge.service';
import { PairingService } from './services/pairing.service';

@Module({ controllers: [DevicesController], providers: [DevicesRepository, PairingService, DevicesBridgeService], exports: [PairingService] })
export class DevicesModule {}
