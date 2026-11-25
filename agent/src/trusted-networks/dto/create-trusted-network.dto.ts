import type { TrustedNetworkEntity } from '../entities/trusted-network.entity';

export class CreateTrustedNetworkDto implements TrustedNetworkEntity {
  ssid!: string;
  addedAt!: string;
}
