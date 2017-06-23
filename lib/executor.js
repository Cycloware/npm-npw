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
const notifier_1 = require("./notifier");
const executingAsRoot = isRoot();
if (executingAsRoot) {
    console.log(`Running as:  ${executingAsRoot ? 'SUDO'.red : 'normal user'.green}`);
}
function executor(exec) {
    let { commandText, argsIn = [], argsAsIs = [], } = exec;
    if (argsIn.length === 0) {
        argsIn = process.argv.slice(2);
    }
    else {
        if (argsAsIs.length === 0) {
            argsIn = argsIn.concat(process.argv.slice(2));
        }
    }
    notifier_1.notifier(); // Update notifier.
    let blast;
    let verbose = true;
    let brief = false;
    let noLines = false;
    let loud = false;
    let lineEnding;
    let global = false;
    let dualPhaseMode;
    let unlinkMode = false;
    let changeDirTo = undefined;
    const startingDirectory = process.cwd();
    const commands = commandBuilder_1.CommandBuilder.Start()
        .command(['--list-globals', '--list-global', '-list-globals', '-list-global'], (nArgs, argsToPass, argsToEnd) => {
        argsToPass.push('ls', '--global', '--depth', '0');
        if (lineEnding === 'default') {
            lineEnding = 'none';
        }
    })
        .command(['--cd', '-cd', 'cd'], (nArgs) => {
        changeDirTo = nArgs;
    }, {
        nArgs: 1,
    })
        .command(['--loud', '-loud'], () => {
        loud = true;
    })
        .command(['--global', '-g'], () => {
        global = true;
        if (lineEnding === 'default') {
            lineEnding = 'none';
        }
    }, {
        justPeek: true,
    })
        .command(['--run', '-run'], (nArgs, argsToPass, argsToEnd) => {
        argsToPass.push('run');
        if (lineEnding === 'default') {
            lineEnding = 'none';
        }
    })
        .command(['--dev', '-dev'], (nArgs, argsToPass) => {
        argsToPass.push('--save-dev');
    })
        .command(['--package-unlink'], (nArgs, argsToPass) => {
        argsToPass.push('uninstall', '-g');
        unlinkMode = true;
    })
        .command(['--package-relink'], (nArgs, argsToPass) => {
        dualPhaseMode = 'package-relink';
    })
        .command(['--uninstall-install', '--un-in', '--unin', 'uninstall-install', 'un-in', 'unin'], (nArgs, argsToPass) => {
        dualPhaseMode = 'uninstall-install';
    })
        .command(['--blast', '--blast-all', 'blast'], () => blast = 'all')
        .command(['--blast-node', '--blast-node_modules', '--blast-node-modules', 'blast-node', 'blast-node_modules', 'blast-node-modules'], () => blast = 'node')
        .command(['--blast-lock', 'blast-lock'], () => blast = 'lock')
        .command(['--no-lines', '--no-line'], () => noLines = true)
        .command(['--line-crlf', '--lines-crlf'], () => lineEnding = 'crlf')
        .command(['--line-lf', '--lines-lf'], () => lineEnding = 'lf')
        .command(['--line-cr', '--lines-cr'], () => lineEnding = 'cr');
    const commandsResult = commands.processCommands(argsIn);
    const { actionsMatched, args: { toPass: argsToPass, toPassLead: argsToPassLead, toPassAdditional: argsToPassAdditional } } = commandsResult;
    // const argvParsed = argv3.parse;
    let changeWorkingDirBackTo = undefined;
    try {
        if (changeDirTo) {
            if (changeDirTo.length < 1) {
                console.error(`${'Error:'.red}  option '${'--cd'.red}' must be followed by a relative or absolute path.`);
                return Promise.reject(-1);
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
                        return Promise.reject(-1);
                    }
                }
                catch (err) {
                    console.error(`${'Cannot change directory to:'.red}  '${inputDir.black.bgWhite}', please ensure it exists${inputRelative ? `, absolutePath '${absolutePath.black.bgWhite}', currentDirectory: ${startingDirectory.black.bgWhite}'` : ''}; Error: ${chalk.red(err)}`);
                    return Promise.reject(-1);
                }
            }
        }
        if (lineEnding === 'default') {
            // read from .get config, etc.
            lineEnding = 'crlf';
        }
        if (noLines || !lineEnding) {
            lineEnding = 'none';
        }
        if (global) {
            console.log(`In ${'global mode'.yellow}...`);
        }
        // console.log(`argv: ${chalk.yellow(JSON.stringify(argv, null, 1))}`);
        let spawnCaller = spawner_1.spawnerNpm;
        const startingPromise = Promise.resolve();
        let blastPromise = startingPromise;
        if (blast) {
            blastPromise = spawner_1.spawnerBlast(blast, false);
        }
        let argsPass1 = [].concat(argsToPassLead).concat(argsToPass).concat(argsToPassAdditional);
        let argsPass2 = [].concat(argsPass1);
        let npmPromise = blastPromise;
        let dualCommandName = undefined;
        if (dualPhaseMode === 'package-relink') {
            dualCommandName = 'package-relink';
        }
        else if (unlinkMode) {
            dualCommandName = 'unlink';
        }
        // check real args left
        if (argsToPass.length === 0) {
            if (dualCommandName) {
                let autoDeterminedPackageName = undefined;
                try {
                    const config = fs.readJsonSync('./package.json');
                    if (config) {
                        if (typeof config.name === 'string') {
                            autoDeterminedPackageName = config.name;
                        }
                    }
                    if (autoDeterminedPackageName) {
                        argsPass1 = argsPass1.concat([autoDeterminedPackageName]);
                        console.log(`Using auto-determined package name '${autoDeterminedPackageName.yellow}' for ${dualPhaseMode.cyan} command.  From directory '${process.cwd().gray}'`);
                    }
                    else {
                        console.error(`${dualPhaseMode.cyan} mode requires at least a package name and one could not be determined in '${process.cwd().gray}'.  Check to see if a ${'package.json'.gray} file exists there or specify a package name'.`);
                        return Promise.reject(-2);
                    }
                }
                catch (err) {
                    console.error(`${dualPhaseMode.cyan} mode requires at least a package name and one could not be determined in '${process.cwd().gray}'.  Check to see if a ${'package.json'.gray} file exists there or specify a package name'.  Error: ${chalk.red(err)}`);
                    return Promise.reject(-2);
                }
            }
        }
        if (argsPass1.length > 0) {
            if (dualPhaseMode) {
                // argsPassed = argsPassed.filter(p => ['uninstall', 'un', 'unlink', 'remove', 'rm', 'r', 'install', 'i', 'isntall', 'add'].indexOf(p) < 0)
                if (dualPhaseMode === 'uninstall-install') {
                    npmPromise = npmPromise.then(() => spawnCaller(['uninstall'].concat(argsPass1), verbose))
                        .then(() => spawnCaller(['install'].concat(argsPass2), verbose));
                }
                else if (dualPhaseMode === 'package-relink') {
                    npmPromise = npmPromise.then(() => spawnCaller(['uninstall', '-g'].concat(argsPass1), verbose))
                        .then(() => spawnCaller(['link'].concat(argsPass2), verbose));
                }
                else {
                    console.error(`Unknown dual-phase-mode '${dualPhaseMode.red}'`);
                    return Promise.reject(-1);
                }
            }
            else {
                npmPromise = npmPromise.then(() => spawnCaller(argsPass1, verbose));
            }
        }
        if (argsPass1.length < 1) {
            if (dualPhaseMode) {
                console.error(`${dualPhaseMode.cyan} mode requires at least a package name`);
                return Promise.reject(-1);
            }
        }
        let linesPromise = npmPromise;
        if (lineEnding !== 'none') {
            linesPromise = linesPromise.then(() => {
                return spawner_1.spawnerLines(lineEnding, verbose);
            });
        }
        if (linesPromise === startingPromise) {
            console.warn(`${'Nothing was executed!'.yellow}`);
        }
        return linesPromise.tap(() => {
            if (changeWorkingDirBackTo) {
                changeWorkingDirBackTo('lastPromise.then');
            }
        }).catch(err => {
            if (changeWorkingDirBackTo) {
                changeWorkingDirBackTo(`lastPromise.catch; err: ${chalk.red(err)}`);
            }
            throw err;
        });
    }
    catch (err) {
        console.error(`${'Unhandled exception:'.red}  ${chalk.gray.bgBlack(err)}`);
        return Promise.reject(-1);
    }
    finally {
        if (changeWorkingDirBackTo) {
            changeWorkingDirBackTo('finally');
        }
    }
}
exports.executor = executor;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvZXhlY3V0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxrQkFBZ0I7QUFDaEIsb0NBQW9DO0FBRXBDLCtCQUFnQztBQUVoQywyQ0FBbUY7QUFFbkYsdUNBQXdDO0FBQ3hDLDZCQUE4QjtBQUc5Qix1Q0FBb0M7QUFFcEMsa0NBQW1DO0FBRW5DLHFEQUFrRDtBQUVsRCx5Q0FBc0M7QUFFdEMsTUFBTSxlQUFlLEdBQUcsTUFBTSxFQUFFLENBQUM7QUFFakMsRUFBRSxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztJQUNwQixPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixlQUFlLEdBQUcsTUFBTSxDQUFDLEdBQUcsR0FBRyxhQUFhLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtBQUNuRixDQUFDO0FBRUQsa0JBQXlCLElBQW9FO0lBRTNGLElBQUksRUFBRSxXQUFXLEVBQUUsTUFBTSxHQUFHLEVBQUUsRUFBRSxRQUFRLEdBQUcsRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDO0lBQ3hELEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4QixNQUFNLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakMsQ0FBQztJQUFDLElBQUksQ0FBQyxDQUFDO1FBQ04sRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzFCLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDL0MsQ0FBQztJQUNILENBQUM7SUFFRCxtQkFBUSxFQUFFLENBQUMsQ0FBQyxtQkFBbUI7SUFFL0IsSUFBSSxLQUFpQixDQUFDO0lBQ3RCLElB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