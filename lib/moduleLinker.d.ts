/// <reference types="bluebird" />
import 'colors';
import * as Promise from 'bluebird';
export declare function moduleLinker(exec: {
    commandText: string;
    argsIn?: string[];
    argsAsIs?: string[];
    argsToNpm?: string[];
}): Promise<any>;
