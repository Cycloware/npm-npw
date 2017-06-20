/// <reference types="bluebird" />
import 'colors';
import * as Promise from 'bluebird';
export declare function executor(exec: {
    commandText: string;
    argsIn: string[];
    argsAsIs?: string[];
}): Promise<void> | -1 | -2;
