import 'colors';
export declare namespace CommandBuilder {
    type IOptions = {
        nArgs: number;
        justPeek: boolean;
    };
    type CommandAction = (nArgs?: string[], argsToPass?: string[], argsToEnd?: string[]) => void;
    type ICommandActionItem = {
        key: string;
        keyActual: string;
        nArgs: number;
        justPeek: boolean;
        action: CommandBuilder.CommandAction;
        commandObject: ICommandObject;
    };
    type TSwitchMap = {
        [key: string]: ICommandActionItem;
    };
    type ICommandObject = {
        switches: string[];
        switchMap: TSwitchMap;
        action: CommandBuilder.CommandAction;
        nArgs: number;
        justPeek: boolean;
    };
}
export declare class CommandBuilder {
    commandObjects: CommandBuilder.ICommandObject[];
    actionArrayMap: CommandBuilder.ICommandActionItem[];
    lookupActionMap: CommandBuilder.TSwitchMap;
    defaultCommandOptions: CommandBuilder.IOptions;
    addCommandOption(switches: string[], action: CommandBuilder.CommandAction, options?: Partial<CommandBuilder.IOptions>): CommandBuilder.ICommandObject;
    private static nullActionItem;
    processCommands(argsIn: string[]): {
        actionsMatched: {
            [key: string]: {
                matchDex: number;
            } & CommandBuilder.ICommandActionItem;
        };
        args: {
            in: string[];
            toPassLead: string[];
            toPass: string[];
            toPassAdditional: string[];
        };
    };
}
