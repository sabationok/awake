import { EntityRepository, FindManyQueryBase, SqliteRepository } from '@nest-kit/sqlite';
import { TrustedNetworkEntity } from '../entities/trusted-network.entity';
import { FindOneTrustedNetworkQuery } from '../query/find-one-trusted-network.query';

@EntityRepository(TrustedNetworkEntity)
export class TrustedNetworksRepository extends SqliteRepository<TrustedNetworkEntity, FindOneTrustedNetworkQuery, FindManyQueryBase> {}
