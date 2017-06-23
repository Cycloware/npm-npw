/// <reference types="bluebird" />
import 'colors';
import * as Promise from 'bluebird';
export declare type IMessageLogger = {
    [P in KLogger]: (msg: string) => void;
};
export declare type KLogger = 'trace' | 'info' | 'warn' | 'error';
export declare let GlobalLogger: IMessageLogger;
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
export declare function moduleLinker(exec: {
    commandText: string;
    argsIn?: string[];
    argsAsIs?: string[];
    argsToNpm?: string[];
}): Promise<any>;
