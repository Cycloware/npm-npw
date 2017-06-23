export declare function buildLogger(levels: KLogger[]): {
    trace(msg: string): void;
    info(msg: string): void;
    warn(msg: string): void;
    error(msg: string): void;
};
export declare type IMessageLogger<KLog extends string = KLogger> = {
    [P in KLog]: (msg: string) => void;
};
export declare type KLogger = 'trace' | 'info' | 'warn' | 'error';
export interface IMessages {
    messages: IMessages.Core;
}
export declare namespace IMessages {
    interface Core extends IMessageLogger {
        readonly items: {
            type: KLogger;
            msg: string;
        }[];
    }
    interface WithError extends IMessages {
        errorMessage: string;
    }
    interface WithPossibleError extends IMessages {
        errorMessage?: string;
    }
}
export declare function buildMessages(): IMessages;
export declare function buildMessagesCore(): IMessages.Core;
