/// <reference types="node" />
import 'colors';
import fs = require('fs-extra-promise');
export declare namespace getStatInfo {
    export import Stats = fs.Stats;
    type TResultError = {
        result: 'not-found' | 'error';
        path: string;
        message: string;
        errorObject: any;
    };
    type TResultGood = {
        result: 'stat-returned';
        path: string;
        resolveLinks: boolean;
        resolvedLink?: TInfo;
    } & TInfo;
    type TInfo = {
        isDirectory: boolean;
        isFile: boolean;
        isSymbolicLink: boolean;
        type: 'file' | 'directory' | 'symlink' | 'unknown';
        stat: 'lstat' | 'stat';
        statRet: Stats;
    };
    type TResult = TResultGood | TResultError;
    function Async(path: string, resolveLinks: boolean): Promise<TResult>;
    function Sync(path: string, resolveLinks: boolean): TResult;
}
