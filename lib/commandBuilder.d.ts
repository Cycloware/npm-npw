import 'colors';
export declare namespace CommandBuilder {
    type IOptions = {
        nArgs: number;
        justPeek: boolean;
    };
    type CommandAction = (args: {
        taken: string[];
        toLead: string[];
        toPass: string[];
        toEnd: string[];
    }) => void;
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
    protected constructor();
    static Start(): CommandBuilder;
    protected commandObjects: CommandBuilder.ICommandObject[];
    protected actionArrayMap: CommandBuilder.ICommandActionItem[];
    protected lookupActionMap: CommandBuilder.TSwitchMap;
    protected defaultCommandOptions: CommandBuilder.IOptions;
    command(switches: string[], action: CommandBuilder.CommandAction, options?: Partial<CommandBuilder.IOptions>): this;
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
