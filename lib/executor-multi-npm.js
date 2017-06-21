"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("colors");
const Promise = require("bluebird");
const chalk = require("chalk");
const spawner_1 = require("./npm/spawner");
const fs = require("fs-extra-promise");
const path = require("path");
const unquote_1 = require("./unquote");
const isRoot = require("is-root");
const commandBuilder_1 = require("./commandBuilder");
const executingAsRoot = isRoot();
if (executingAsRoot) {
    console.log(`Running as:  ${executingAsRoot ? 'SUDO'.red : 'normal user'.green}`);
}
function executor(exec) {
    let { commandText, argsIn = [], argsAsIs = [], argsToNpm = [] } = exec;
    if (argsIn.length === 0) {
        argsIn = process.argv.slice(2);
    }
    else {
        if (argsAsIs.length === 0) {
            argsIn = argsIn.concat(process.argv.slice(2));
        }
    }
    let verbose = true;
    let global = true;
    let changeDirTo = undefined;
    const startingDirectory = process.cwd();
    const commands = commandBuilder_1.CommandBuilder.Start()
        .command(['--cd', '-cd', 'cd'], (nArgs) => {
        changeDirTo = nArgs;
    }, {
        nArgs: 1,
    });
    const commandsResult = commands.processCommands(argsIn);
    const { actionsMatched, args: { toPass: argsToPass, toPassLead: argsToPassLead, toPassAdditional: argsToPassAdditional } } = commandsResult;
    // const argvParsed = argv3.parse;
    let changeWorkingDirBackTo = undefined;
    try {
        if (changeDirTo) {
            if (changeDirTo.length < 1) {
                console.error(`${'Error:'.red}  option '${'--cd'.red}' must be followed by a relative or absolute path.`);
                return Promise.resolve(-1);
            }
            else {
                const rawDir = changeDirTo[0];
                const inputDir = unquote_1.unquote(rawDir);
                const inputRelative = !path.isAbsolute(inputDir);
                const absolutePath = path.resolve(startingDirectory, inputDir);
                try {
                    if (fs.existsSync(absolutePath)) {
                        console.log(`Changing working directory to '${inputDir.yellow}'`);
                        process.chdir(absolutePath);
                        // no need to change back
                        // changeWorkingDirBackTo = (from) => {
                        //   // process.chdir(currentDirectory);
                        //   if (loud) {
                        //     console.log(`Changing working directory back to '${currentDirectory.yellow}${true ? ` from: ${chalk.red(from)}` : ''}'`);
                        //   }
                        //   // changeWorkingDirBackTo = undefined;
                        // }
                    }
                    else {
                        console.error(`${'Cannot change directory to:'.red}  '${inputDir.black.bgWhite}', please ensure it exists${inputRelative ? `, absolutePath '${absolutePath.black.bgWhite}', currentDirectory: ${startingDirectory.black.bgWhite}'` : ''}`);
                        return Promise.resolve(-1);
                    }
                }
                catch (err) {
                    console.error(`${'Cannot change directory to:'.red}  '${inputDir.black.bgWhite}', please ensure it exists${inputRelative ? `, absolutePath '${absolutePath.black.bgWhite}', currentDirectory: ${startingDirectory.black.bgWhite}'` : ''}; Error: ${chalk.red(err)}`);
                    return Promise.resolve(-1);
                }
            }
        }
        // if (lines === 'default') {
        //   // read from .get config, etc.
        //   lines = 'crlf';
        // }
        // if (noLines || lines === false) {
        //   lines = 'none';
        // }
        if (global) {
            console.log(`In ${'global mode'.yellow}...`);
        }
        // console.log(`argv: ${chalk.yellow(JSON.stringify(argv, null, 1))}`);
        let spawnCaller = spawner_1.spawnerNpm;
        const startingPromise = Promise.resolve();
        let npmPromise = startingPromise;
        if (argsToPass.length > 0) {
            let argsPass1 = [].concat(argsToPassLead).concat(argsToPass).concat(argsToPassAdditional);
            let allArgs = argsToPass.map(p => [].concat(argsToNpm).concat(argsToPassLead).concat([p]).concat(argsToPassAdditional));
            for (const argX of allArgs) {
                npmPromise = npmPromise.then(() => spawnCaller(argX, verbose));
            }
        }
        if (argsToPass.length < 1) {
            console.error(`${commandText.cyan} mode requires at least a package name`);
            return Promise.resolve(-1);
        }
        let linesPromise = npmPromise;
        // if (lines !== 'none') {
        //   linesPromise = linesPromise.then(() => {
        //     spawnCaller.lines(lines, verbose);
        //   })
        // }
        return linesPromise.tap(val => {
            if (changeWorkingDirBackTo) {
                changeWorkingDirBackTo('lastPromise.tap');
            }
        }).tapCatch(err => {
            if (changeWorkingDirBackTo) {
                changeWorkingDirBackTo(`lastPromise.catch; err: ${chalk.red(err)}`);
            }
            throw err;
        });
    }
    catch (err) {
        console.error(`${'Unhandled exception:'.red}  ${chalk.gray.bgBlack(err)}`);
        return Promise.resolve(-1);
    }
    finally {
        if (changeWorkingDirBackTo) {
            changeWorkingDirBackTo('finally');
        }
    }
}
exports.executor = executor;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0b3ItbXVsdGktbnBtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2V4ZWN1dG9yLW11bHRpLW5wbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLGtCQUFnQjtBQUNoQixvQ0FBb0M7QUFFcEMsK0JBQWdDO0FBRWhDLDJDQUFtRjtBQUVuRix1Q0FBd0M7QUFDeEMsNkJBQThCO0FBRTlCLHVDQUFvQztBQUVwQyxrQ0FBbUM7QUFFbkMscURBQWtEO0FBRWxELE1BQU0sZUFBZSxHQUFHLE1BQU0sRUFBRSxDQUFDO0FBRWpDLEVBQUUsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7SUFDcEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsZUFBZSxHQUFHLE1BQU0sQ0FBQyxHQUFHLEdBQUcsYUFBYSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7QUFDbkYsQ0FBQztBQUdELGtCQUF5QixJQUEyRjtJQUVsSCxJQUFJLEVBQUUsV0FBVyxFQUFFLE1BQU0sR0FBRyxFQUFFLEVBQUUsUUFBUSxHQUFHLEVBQUUsRUFBRSxTQUFTLEdBQUcsRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDO0lBQ3ZFLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4QixNQUFNLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakMsQ0FBQztJQUFDLElBQUksQ0FBQyxDQUFDO1FBQ04sRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzFCLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDL0MsQ0FBQztJQUNILENBQUM7SUFFRCxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUM7SUFDbkIs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