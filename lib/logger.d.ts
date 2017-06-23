import { IMessageLogger, KLogger } from './logger-messages';
export * from './logger-messages';
export declare let GlobalLogger: IMessageLogger;
export declare function changeGlobalLogger(levels: KLogger[]): IMessageLogger<KLogger>;
export declare function changeGlobalLoggerTo(logger: IMessageLogger): IMessageLogger<KLogger>;
