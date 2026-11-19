import { Global, Module } from '@nestjs/common';
import { AGENT_CONFIG, readAgentConfig } from './agent-config';

@Global()
@Module({
  providers: [{ provide: AGENT_CONFIG, useFactory: () => readAgentConfig() }],
  exports: [AGENT_CONFIG],
})
export class ConfigModule {}
