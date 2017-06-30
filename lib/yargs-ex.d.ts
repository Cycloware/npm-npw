import * as yargs from 'yargs';
export declare type TOptionType<T> = {
    propType: T;
};
export declare function buildCommandOptions<TOptions extends {
    [key: string]: (yargs.Options & TOptionType<any>);
}>(options: TOptions): {
    options: TOptions;
    keyMap: {
        [KOptions in keyof TOptions]: string;
    };
    type: {
        [KOptions in keyof TOptions]: TOptions[KOptions]["propType"];
    };
};
