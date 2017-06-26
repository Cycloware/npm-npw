import 'colors';
export declare function executor(exec: {
    commandText: string;
    argsIn?: string[];
    argsAsIs?: string[];
    argsToNpm?: string[];
}): Promise<string>;
