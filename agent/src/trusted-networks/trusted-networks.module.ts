import { Global, Module } from '@nestjs/common';
import { TrustedNetworksRepository } from './repositories/trusted-networks.repository';
import { TrustedNetworksListener, TrustedNetworksService } from './services/trusted-networks';

/** Довірені мережі Wi-Fi у SQLite. Глобальний: його читають гард, presence, пристрої і сторінка «Стан Mac». */
@Global()
@Module({ providers: [TrustedNetworksRepository, TrustedNetworksService, TrustedNetworksListener], exports: [TrustedNetworksService] })
export class TrustedNetworksModule {}
