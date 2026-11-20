import { Global, Module } from '@nestjs/common';
import { TlsService } from './services/tls.service';

@Global()
@Module({
  providers: [TlsService],
  exports: [TlsService],
})
export class TlsModule {}
