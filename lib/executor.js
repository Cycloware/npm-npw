"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("colors");
const chalk = require("chalk");
const ora = require("ora");
const spawner_1 = require("./npm/spawner");
const fs = require("fs-extra-promise");
const notifier_1 = require("./notifier");
const commandBuilder_1 = require("./commandBuilder");
const changeDirectory_1 = require("./changeDirectory");
const getChangeDirectoryToWithThrow_1 = require("./getChangeDirectoryToWithThrow");
const logger_1 = require("./logger");
const executor_sym_installer_1 = require("./executor-sym-installer");
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
    let runSymlinker = 'default';
    let noExact = undefined;
    let installCalled = undefined;
    const commands = commandBuilder_1.CommandBuilder.Start()
        .command(['--list-globals', '--list-global', '-list-globals', '-list-global'], ({ toPass }) => {
        toPass.push('ls', '--global', '--depth', '0');
        if (lineEnding === 'default') {
            lineEnding = 'none';
        }
    })
        .command(['--cd', '-cd', 'cd'], ({ taken }) => {
        changeDirTo = taken;
    }, {
        nArgs: 1,
    })
        .command(['--loud', '-loud'], () => {
        loud = true;
    })
        .command(['--sym'], () => {
        runSymlinker = 'yes';
    })
        .command(['--noexact', '--no-exact'], () => {
        if (noExact === undefined) {
            noExact = true;
        }
    })
        .command(['-E', '--save-exact'], () => {
        noExact = false;
    }, {
        justPeek: true,
    })
        .command(['install', 'i'], () => {
        installCalled = true;
    }, {
        justPeek: true,
    })
        .command(['--no-sym', '--nosym'], () => {
        runSymlinker = 'no';
    })
        .command(['--global', '-g'], () => {
        global = true;
        if (lineEnding === 'default') {
            lineEnding = 'none';
        }
    }, {
        justPeek: true,
    })
        .command(['--run', '-run'], ({ toPass }) => {
        toPass.push('run');
        if (lineEnding === 'default') {
            lineEnding = 'none';
        }
    })
        .command(['--dev', '-dev'], ({ toPass }) => {
        toPass.push('--save-dev');
    })
        .command(['--package-unlink'], ({ toPass }) => {
        toPass.push('uninstall', '-g');
        unlinkMode = true;
    })
        .command(['--package-relink'], (nArgs) => {
        dualPhaseMode = 'package-relink';
    })
        .command(['--uninstall-install', '--un-in', '--unin', 'uninstall-install', 'un-in', 'unin'], (nArgs) => {
        dualPhaseMode = 'uninstall-install';
    })
        .command(['--blast', '--blast-all', 'blast'], () => blast = 'all')
        .command(['--blast-node', '--blast-node_modules', '--blast-node-modules', 'blast-node', 'blast-node_modules', 'blast-node-modules'], () => blast = 'node')
        .command(['--blast-lock', 'blast-lock'], () => blast = 'lock')
        .command(['--no-lines', '--no-line'], () => noLines = true)
        .command(['--line-crlf', '--lines-crlf'], () => lineEnding = 'crlf')
        .command(['--line-lf', '--lines-lf'], () => lineEnding = 'lf')
        .command(['--line-cr', '--lines-cr'], () => lineEnding = 'cr');
    {
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
                if (!noExact) {
                    if (installCalled || dualPhaseMode === 'uninstall-install') {
                        argsToPassAdditional.push('--save-exact');
                    }
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
                if (runSymlinker === 'yes') {
                    const noSpinner = true;
                    logger_1.GlobalLogger.info('');
                    let spinner = ora({
                        color: 'yellow'
                    });
                    const symlinkName = 'symlink modules';
                    const startMessage = `${chalk.yellow('Running')} ${chalk.cyan(symlinkName)}`;
                    ;
                    if (noSpinner) {
                        logger_1.GlobalLogger.info(`
${chalk.yellow('-')} ${startMessage}
`);
                    }
                    else {
                        spinner.text = startMessage;
                        spinner.start();
                    }
                    try {
                        await executor_sym_installer_1.moduleLinker({ commandText: `${commandText} --sym`, argsIn: [], noHeader: true });
                        const finishMessage = `${chalk.green('Finished')} ${chalk.cyan(symlinkName)}`;
                        if (verbose) {
                            logger_1.GlobalLogger.info(`
${chalk.green('√')} ${finishMessage}`);
                        }
                        else {
                            spinner.succeed(finishMessage);
                        }
                    }
                    catch (err) {
                        const errorMessage = `${chalk.red('Error')} ${chalk.cyan(symlinkName)}`;
                        if (verbose) {
                            logger_1.GlobalLogger.info(`
${chalk.green('√')} ${errorMessage}`);
                        }
                        else {
                            spinner.fail(errorMessage);
                        }
                        throw err;
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
}
exports.executor = executor;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvZXhlY3V0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxrQkFBZ0I7QUFDaEIsK0JBQWdDO0FBQ2hDLDJCQUE0QjtBQUU1QiwyQ0FBbUY7QUFFbkYsdUNBQXdDO0FBTXhDLHlDQUFzQztBQUV0QyxxREFBa0Q7QUFDbEQsdURBQW9EO0FBRXBELG1GQUFnRjtBQUdoRixxQ0FBZ0Q7QUFFaEQscUVBQXdEO0FBRWpELEtBQUssbUJBQW1CLElBQW9FO0lBRWpHLElBQUksRUFBRSxXQUFXLEVBQUUsTUFBTSxHQUFHLEVBQUUsRUFBRSxRQUFRLEdBQUcsRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDO0lBQ3hELEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4QixNQUFNLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakMsQ0FBQztJQUFDLElBQUksQ0FBQyxDQUFDO1FBQ04sRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzFCLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDL0MsQ0FBQztJQUNILENBQUM7SUFFRCxtQkFBUSxFQUFFLENBQUMsQ0FBQyxtQkFBbUI7SUFFL0IsSUFBSSxLQUFpQixDQUFDO0lBQ3RCLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQztJQUNuQixJQUFJLEtBQUssR0FBRyxLQUFLLENBQUM7SUFDbEIsSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFDO0lBQ3BCLElBQUksSUFBSSxHQUFHLEtBQUssQ0FBQztJQUNqQixJQUFJLFVBQXFELENBQUM7SUFDMUQsSUFBSSxNQUFNLEdBQUcsS0FB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