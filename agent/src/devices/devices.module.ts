import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { DevicesRepository } from './repositories/devices.repository';
import { PairingService } from './services/pairing.service';

@Module({ controllers: [DevicesController], providers: [DevicesRepository, PairingService], exports: [PairingService] })
export class DevicesModule {}
