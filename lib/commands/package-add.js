"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("colors");
const yargs_ex_1 = require("../yargs-ex");
exports.commandOptions = yargs_ex_1.buildCommandOptions({
    'packages': {
        description: 'Name of package(s) to add.',
        array: true,
        string: true,
        required: true,
        type: 'string',
        propType: null,
    },
    'global': {
        alias: 'g',
        boolean: true,
        default: false,
        description: 'Install package globally.',
        propType: null,
    },
    'no-rebuild-symlinks': {
        description: 'Do NOT remove symlinks before package install and then add them back (Only for modules that use symlinks).',
        // alias: 'g',
        boolean: true,
        default: false,
        propType: null,
    }
});
const { options, keyMap } = exports.commandOptions;
exports.package_add = {
    command: `add [${keyMap['packages']}..]`,
    aliases: ['+'],
    desc: 'Set a config variable',
    builder: (yargs) => yargs
        .options(options)
        .string([keyMap['packages']]),
    handler: (args) => {
        const { cd, global, packages, 'no-rebuild-symlinks': noRebuildSymlinks } = args;
        console.log(`In package add: ${JSON.stringify(args, null, 1).white}`.gray);
    },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1hZGQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29tbWFuZHMvcGFja2FnZS1hZGQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxrQkFBZ0I7QUEyQmhCLDBDQUFrRDtBQUVyQyxRQUFBLGNBQWMsR0FBRyw4QkFBbUIsQ0FBQztJQUNoRCxVQUFVLEVBQUU7UUFDVixXQUFXLEVBQUUsNEJBQTRCO1FBQ3pDLEtBQUssRUFBRSxJQUFJO1FBQ1gsTUFBTSxFQUFFLElBQUk7UUFDWixRQUFRLEVBQUUsSUFBSTtRQUNkLElBQUksRUFBRSxRQUFRO1FBQ2QsUUFBUSxFQUFFLElBQWdCO0tBQzNCO0lBQ0QsUUFBUSxFQUFFO1FBQ1IsS0FBSyxFQUFFLEdBQUc7UUFDVixPQUFPLEVBQUUsSUFBSTtRQUNiLE9BQU8sRUFBRSxLQUFLO1FBQ2QsV0FBVyxFQUFFLDJCQUEyQjtRQUN4QyxRQUFRLEVBQUUsSUFBZTtLQUMxQjtJQUNELHFCQUFxQixFQUFFO1FBQ3JCLFdBQVcsRUFBRSw0R0FBNEc7UUFDekgsY0FBYztRQUNkLE9BQU8sRUFBRSxJQUFJO1FBQ2IsT0FBTyxFQUFFLEtBQUs7UUFDZCxRQUFRLEVBQUUsSUFBZTtLQUMxQjtDQUNGLENBQUMsQ0FBQztBQUVILE1BQU0sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLEdBQUcsc0JBQWMsQ0FBQztBQUk5QixRQUFBLFdBQVcsR0FBd0I7SUFDOUMsT0FBTyxFQUFFLFFBQVEsTUFBTSxDQUFDLFVBQVUsQ0FBQyxLQUFLO0lBQ3hDLE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQztJQUNkLElBQUksRUFBRSx1QkFBdUI7SUFDN0IsT0FBTyxFQUFFLENBQUMsS0FBSyxLQUFLLEtBQUs7U0FDdEIsT0FBTyxDQUFDLE9BQU8sQ0FBQztTQUNoQixNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztJQUUvQixPQUFPLEVBQUUsQ0FBQyxJQUFXO1FBQ25CLE1BQU0sRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxxQkFBcUIsRUFBRSxpQkFBaUIsRUFBRSxHQUFHLElBQUksQ0FBQztRQUVoRixPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDNUUsQ0FBQztDQUNGLENBQUEifQ==