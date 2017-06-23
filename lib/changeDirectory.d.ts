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
    function Async<TResult>(args: {
        absoluteNewCurrentDirectory: string;
        log?: IMessageLogger;
        currentDirectoryOverride?: string;
        caseSensitive?: boolean;
    }, action: (state?: TState) => Promise<TResult>): Promise<TResult>;
}
