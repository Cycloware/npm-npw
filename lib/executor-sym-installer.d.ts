import 'colors';
export declare function moduleLinker(exec: {
    commandText: string;
    argsIn?: string[];
    argsAsIs?: string[];
    argsToNpm?: string[];
    noHeader?: boolean;
    noEmptyPackageSectionMessage?: boolean;
}): Promise<any>;
