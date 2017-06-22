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
