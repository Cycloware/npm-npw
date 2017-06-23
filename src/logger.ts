import { IMessageLogger, buildLogger, KLogger } from './logger-messages';
export * from './logger-messages';

export let GlobalLogger: IMessageLogger = buildLogger(['info', 'warn', 'error']);

export function changeGlobalLogger(levels: KLogger[]) {
  return changeGlobalLoggerTo(buildLogger(levels));
}

export function changeGlobalLoggerTo(logger: IMessageLogger) {
  return GlobalLogger = logger;
}


