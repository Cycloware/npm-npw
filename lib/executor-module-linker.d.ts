/// <reference types="bluebird" />
import 'colors';
import * as Promise from 'bluebird';
export interface IMessageLogger {
    trace(msg: string): this;
    info(msg: string): this;
    warn(msg: string): this;
    error(msg: string): this;
}
export declare const NullLogger: IMessageLogger;
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
        action: (state?: TState) => Promise<TResult>;
        log?: IMessageLogger;
        currentDirectoryOverride?: string;
        caseSensitive?: boolean;
    }): Promise<TResult>;
}
export declare function moduleLinker(exec: {
    commandText: string;
    argsIn?: string[];
    argsAsIs?: string[];
    argsToNpm?: string[];
}): Promise<any>;
