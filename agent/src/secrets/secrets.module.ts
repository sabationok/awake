import { Global, Module } from '@nestjs/common';
import { AppSecretsListener, AppSecretsService } from './services/app-secrets';

/** Глобальні секрети аппки (ключ воркспейсу webhooxy, ключ JWT). Глобальний: їх читають relay і вебхуки. */
@Global()
@Module({ providers: [AppSecretsService, AppSecretsListener], exports: [AppSecretsService] })
export class SecretsModule {}
