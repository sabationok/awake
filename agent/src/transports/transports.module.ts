import { Global, Module } from '@nestjs/common';
import { TransportsService } from './transports.service';

@Global()
@Module({ providers: [TransportsService], exports: [TransportsService] })
export class TransportsModule {}
