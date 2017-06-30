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
    let noExact = true;
    let installCalled = undefined;
    let uninstallSym = false;
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
        .command(['add', '+'], ({ toPass }) => {
        installCalled = true;
        toPass.push('install');
    }, {})
        .command(['install', 'i'], () => {
        // swallow install command
        // installCalled = true;
    }, {})
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
                if (installCalled) {
                    uninstallSym = true;
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
                if (uninstallSym) {
                    const noSpinner = true;
                    logger_1.GlobalLogger.info('');
                    let spinner = ora({
                        color: 'yellow'
                    });
                    const symlinkName = 'remove symlink modules';
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
                        await executor_sym_installer_1.moduleLinker({ commandText: `${commandText} --sym-uninstall`, argsIn: ['--uninstall'], noHeader: true });
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
                        // throw err;
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