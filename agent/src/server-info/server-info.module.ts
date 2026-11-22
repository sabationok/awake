import { Module } from '@nestjs/common';
import { ServerInfoService } from './services/server-info';

/** Знімок інстансу сервера для сторінки «Сервер» Mac-аппки. */
@Module({ providers: [ServerInfoService] })
export class ServerInfoModule {}
