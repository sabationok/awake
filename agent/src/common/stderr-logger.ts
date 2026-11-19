import { ConsoleLogger } from '@nestjs/common';

/** stdout зайнятий протоколом з Mac-аппкою, тому логи Nest ідуть у stderr. */
export class StderrLogger extends ConsoleLogger {
  protected printMessages(...args: Parameters<ConsoleLogger['printMessages']>) {
    const [messages, context, logLevel, , timestampDiff] = args;
    super.printMessages(messages, context, logLevel, 'stderr', timestampDiff);
  }
}
