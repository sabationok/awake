import { Global, Module } from '@nestjs/common';
import { EnvifyListener, EnvifyService } from './services/envify';

/** Envify: змінні сервісу awake-agent за токеном з ~/.config/awake/envify.env. Глобальний: ключі з нього читають relay і далі інші модулі. */
@Global()
@Module({ providers: [EnvifyService, EnvifyListener], exports: [EnvifyService] })
export class EnvifyModule {}
