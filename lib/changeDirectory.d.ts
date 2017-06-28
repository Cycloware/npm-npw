import { IMessageLogger } from './logger';
export declare namespace ChangeDirectory {
    type TState = {
        currentDirectory: {
            old: string;
            new: string;
        };
        changed: boolean;
        caseSensitive: boolean;
        relativeNewCurrentDirectory: string;
    };
    type TError = {
        result: 'not-found' | 'error';
        path: string;
        message: string;
        errorObject: any;
    };
    function Async<TResult>(args: {
        absoluteNewCurrentDirectory: string;
        log?: IMessageLogger;
        currentDirectoryOverride?: string;
        caseSensitive?: boolean;
        traceOutput?: boolean;
    }, action: (state?: TState) => Promise<TResult>, errorProcessor?: (err: any, filepath: string) => TError): Promise<TResult | TError>;
}
