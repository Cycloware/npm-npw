import 'colors';
import * as yargs from 'yargs';
export declare const commandOptions: {
    options: {
        'packages': {
            description: string;
            array: true;
            string: true;
            required: true;
            type: "string";
            propType: string[];
        };
        'global': {
            alias: string;
            boolean: true;
            default: boolean;
            description: string;
            propType: boolean;
        };
        'no-rebuild-symlinks': {
            description: string;
            boolean: true;
            default: boolean;
            propType: boolean;
        };
    };
    keyMap: {
        'packages': string;
        'global': string;
        'no-rebuild-symlinks': string;
    };
    type: {
        'packages': string[];
        'global': boolean;
        'no-rebuild-symlinks': boolean;
    };
};
export declare const package_add: yargs.CommandModule;
