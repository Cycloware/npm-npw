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
    if (argsIn.length > 1) {
        argsIn = process.argv.slice(2);
    }
    else {
        if (argsAsIs.length > 1) {
            argsIn = argsIn.concat(process.argv.slice(2));
        }
    }
    notifier_1.notifier(); // Update notifier.
    const commands = new commandBuilder_1.CommandBuilder();
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
    commands.addCommandOption(['--list-globals', '--list-global', '-list-globals', '-list-global'], (nArgs, argsToPass, argsToEnd) => {
        argsToPass.push('ls', '--global', '--depth', '0');
        if (lineEnding === 'default') {
            lineEnding = 'none';
        }
    });
    commands.addCommandOption(['--cd', '-cd', 'cd'], (nArgs) => {
        changeDirTo = nArgs;
    }, {
        nArgs: 1,
    });
    commands.addCommandOption(['--loud', '-loud'], () => {
        loud = true;
    });
    commands.addCommandOption(['--global', '-g'], () => {
        global = true;
        if (lineEnding === 'default') {
            lineEnding = 'none';
        }
    }, {
        justPeek: true,
    });
    commands.addCommandOption(['--run', '-run'], (nArgs, argsToPass, argsToEnd) => {
        argsToPass.push('run');
        if (lineEnding === 'default') {
            lineEnding = 'none';
        }
    });
    commands.addCommandOption(['--dev', '-dev'], (nArgs, argsToPass) => {
        argsToPass.push('--save-dev');
    });
    commands.addCommandOption(['--package-unlink'], (nArgs, argsToPass) => {
        argsToPass.push('uninstall', '-g');
        unlinkMode = true;
    });
    commands.addCommandOption(['--package-relink'], (nArgs, argsToPass) => {
        dualPhaseMode = 'package-relink';
    });
    commands.addCommandOption(['--uninstall-install', '--un-in', '--unin', 'uninstall-install', 'un-in', 'unin'], (nArgs, argsToPass) => {
        dualPhaseMode = 'uninstall-install';
    });
    commands.addCommandOption(['--blast', '--blast-all', 'blast'], () => blast = 'all');
    commands.addCommandOption(['--blast-node', '--blast-node_modules', '--blast-node-modules', 'blast-node', 'blast-node_modules', 'blast-node-modules'], () => blast = 'node');
    commands.addCommandOption(['--blast-lock', 'blast-lock'], () => blast = 'lock');
    commands.addCommandOption(['--no-lines', '--no-line'], () => noLines = true);
    commands.addCommandOption(['--line-crlf', '--lines-crlf'], () => lineEnding = 'crlf');
    commands.addCommandOption(['--line-lf', '--lines-lf'], () => lineEnding = 'lf');
    commands.addCommandOption(['--line-cr', '--lines-cr'], () => lineEnding = 'cr');
    const commandsResult = commands.processCommands(argsIn);
    const { actionsMatched, args: { toPass: argsToPass, toPassLead: argsToPassLead, toPassAdditional: argsToPassAdditional } } = commandsResult;
    // const argvParsed = argv3.parse;
    let changeWorkingDirBackTo = undefined;
    try {
        if (changeDirTo) {
            if (changeDirTo.length < 1) {
                console.error(`${'Error:'.red}  option '${'--cd'.red}' must be followed by a relative or absolute path.`);
                return -1;
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
                        return -1;
                    }
                }
                catch (err) {
                    console.error(`${'Cannot change directory to:'.red}  '${inputDir.black.bgWhite}', please ensure it exists${inputRelative ? `, absolutePath '${absolutePath.black.bgWhite}', currentDirectory: ${startingDirectory.black.bgWhite}'` : ''}; Error: ${chalk.red(err)}`);
                    return -1;
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
                        return -2;
                    }
                }
                catch (err) {
                    console.error(`${dualPhaseMode.cyan} mode requires at least a package name and one could not be determined in '${process.cwd().gray}'.  Check to see if a ${'package.json'.gray} file exists there or specify a package name'.  Error: ${chalk.red(err)}`);
                    return -2;
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
                    return -1;
                }
            }
            else {
                npmPromise = npmPromise.then(() => spawnCaller(argsPass1, verbose));
            }
        }
        if (argsPass1.length < 1) {
            if (dualPhaseMode) {
                console.error(`${dualPhaseMode.cyan} mode requires at least a package name`);
                return -1;
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
        return -1;
    }
    finally {
        if (changeWorkingDirBackTo) {
            changeWorkingDirBackTo('finally');
        }
    }
}
exports.executor = executor;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvZXhlY3V0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxrQkFBZ0I7QUFDaEIsb0NBQW9DO0FBRXBDLCtCQUFnQztBQUVoQywyQ0FBbUY7QUFFbkYsdUNBQXdDO0FBQ3hDLDZCQUE4QjtBQUU5Qix1Q0FBb0M7QUFFcEMsa0NBQW1DO0FBRW5DLHFEQUFrRDtBQUVsRCx5Q0FBc0M7QUFFdEMsTUFBTSxlQUFlLEdBQUcsTUFBTSxFQUFFLENBQUM7QUFFakMsRUFBRSxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztJQUNwQixPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixlQUFlLEdBQUcsTUFBTSxDQUFDLEdBQUcsR0FBRyxhQUFhLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtBQUNuRixDQUFDO0FBRUQsa0JBQXlCLElBQW9FO0lBRTNGLElBQUksRUFBRSxXQUFXLEVBQUUsTUFBTSxHQUFHLEVBQUUsRUFBRSxRQUFRLEdBQUcsRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDO0lBQ3hELEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0QixNQUFNLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakMsQ0FBQztJQUFDLElBQUksQ0FBQyxDQUFDO1FBQ04sRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hCLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDL0MsQ0FBQztJQUNILENBQUM7SUFFRCxtQkFBUSxFQUFFLENBQUMsQ0FBQyxtQkFBbUI7SUFFL0IsTUFBTSxRQUFRLEdBQUcsSUFBSSwrQkFB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