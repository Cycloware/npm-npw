"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("colors");
const chalk = require("chalk");
const spawner_1 = require("./npm/spawner");
const fs = require("fs-extra-promise");
const isRoot = require("is-root");
const notifier_1 = require("./notifier");
const commandBuilder_1 = require("./commandBuilder");
const changeDirectory_1 = require("./changeDirectory");
const getChangeDirectoryToWithThrow_1 = require("./getChangeDirectoryToWithThrow");
const logger_1 = require("./logger");
const executingAsRoot = isRoot();
if (executingAsRoot) {
    logger_1.GlobalLogger.trace(`Running as:  ${executingAsRoot ? 'SUDO'.red : 'normal user'.green}`);
}
async function executor(exec) {
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
    return await changeDirectory_1.ChangeDirectory.Async({
        absoluteNewCurrentDirectory: await getChangeDirectoryToWithThrow_1.getChangeDirectoryToWithThrow(changeDirTo, startingDirectory),
    }, async (state) => {
        try {
            if (lineEnding === 'default') {
                // read from .git config, etc.
                lineEnding = 'crlf';
            }
            if (noLines || !lineEnding) {
                lineEnding = 'none';
            }
            if (global) {
                logger_1.GlobalLogger.info(`In ${'global mode'.yellow}...`);
            }
            let spawnCaller = spawner_1.spawnerNpm;
            let executionBlocks = 0;
            if (blast) {
                executionBlocks++;
                await spawner_1.spawnerBlast(blast, false);
            }
            let argsPass1 = [].concat(argsToPassLead).concat(argsToPass).concat(argsToPassAdditional);
            let argsPass2 = [].concat(argsPass1);
            let dualCommandName = undefined;
            if (dualPhaseMode === 'package-relink') {
                dualCommandName = 'package-relink';
            }
            else if (unlinkMode) {
                dualCommandName = 'unlink';
            }
            if (argsToPass.length === 0) {
                if (dualCommandName) {
                    let autoDeterminedPackageName = undefined;
                    try {
                        const config = await fs.readJsonAsync('./package.json');
                        if (config) {
                            if (typeof config.name === 'string') {
                                autoDeterminedPackageName = config.name;
                            }
                        }
                        if (autoDeterminedPackageName) {
                            argsPass1 = argsPass1.concat([autoDeterminedPackageName]);
                            logger_1.GlobalLogger.info(`Using auto-determined package name '${autoDeterminedPackageName.yellow}' for ${dualPhaseMode.cyan} command.  From directory '${process.cwd().gray}'`);
                        }
                        else {
                            const msg = `${dualPhaseMode.cyan} mode requires at least a package name and one could not be determined in '${process.cwd().gray}'.  Check to see if a ${'package.json'.gray} file exists there or specify a package name'.`;
                            logger_1.GlobalLogger.error(msg);
                            throw new Error(msg.strip);
                        }
                    }
                    catch (err) {
                        const msg = `${dualPhaseMode.cyan} mode requires at least a package name and one could not be determined in '${process.cwd().gray}'.  Check to see if a ${'package.json'.gray} file exists there or specify a package name'.  Error: ${chalk.red(err)}`;
                        logger_1.GlobalLogger.error(msg);
                        throw new Error(msg.strip);
                    }
                }
            }
            if (argsPass1.length > 0) {
                executionBlocks++;
                if (dualPhaseMode) {
                    if (dualPhaseMode === 'uninstall-install') {
                        await spawnCaller(['uninstall'].concat(argsPass1), verbose);
                        await spawnCaller(['install'].concat(argsPass2), verbose);
                    }
                    else if (dualPhaseMode === 'package-relink') {
                        await spawnCaller(['uninstall', '-g'].concat(argsPass1), verbose);
                        await spawnCaller(['link'].concat(argsPass2), verbose);
                    }
                    else {
                        const msg = `Unknown dual-phase-mode '${dualPhaseMode.red}'`;
                        logger_1.GlobalLogger.error(msg);
                        throw new Error(msg.strip);
                    }
                }
                else {
                    await spawnCaller(argsPass1, verbose);
                }
            }
            if (argsPass1.length < 1) {
                if (dualPhaseMode) {
                    const msg = `${dualPhaseMode.cyan} mode requires at least a package name`;
                    logger_1.GlobalLogger.error(msg);
                    throw new Error(msg.strip);
                }
            }
            if (lineEnding !== 'none') {
                executionBlocks++;
                await spawner_1.spawnerLines(lineEnding, verbose);
            }
            if (executionBlocks === 0) {
                logger_1.GlobalLogger.warn(`${'Nothing was executed!'.yellow}`);
            }
            return 'All done';
        }
        catch (err) {
            const msg = `${'Unhandled exception:'.red}  ${chalk.gray.bgBlack(err)}`;
            logger_1.GlobalLogger.error(msg);
            throw new Error(msg.strip);
        }
    });
}
exports.executor = executor;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvZXhlY3V0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxrQkFBZ0I7QUFDaEIsK0JBQWdDO0FBRWhDLDJDQUFtRjtBQUVuRix1Q0FBd0M7QUFNeEMsa0NBQW1DO0FBRW5DLHlDQUFzQztBQUV0QyxxREFBa0Q7QUFDbEQsdURBQW9EO0FBRXBELG1GQUFnRjtBQUdoRixxQ0FBZ0Q7QUFFaEQsTUFBTSxlQUFlLEdBQUcsTUFBTSxFQUFFLENBQUM7QUFFakMsRUFBRSxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztJQUNwQixxQkFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsZUFBZSxHQUFHLE1BQU0sQ0FBQyxHQUFHLEdBQUcsYUFBYSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7QUFDbEYsQ0FBQztBQUVNLEtBQUssbUJBQW1CLElBQW9FO0lBRWpHLElBQUksRUFBRSxXQUFXLEVBQUUsTUFBTSxHQUFHLEVBQUUsRUFBRSxRQUFRLEdBQUcsRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDO0lBQ3hELEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4QixNQUFNLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakMsQ0FBQztJQUFDLElBQUksQ0FBQyxDQUFDO1FBQ04sRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzFCLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDL0MsQ0FBQztJQUNILENBQUM7SUFFRCxtQkFBUSxFQUFFLENBQUMsQ0FBQyxtQkFBbUI7SUFFL0IsSUFBSSxLQUFpQixDQUFDO0lB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