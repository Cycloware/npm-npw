"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
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
function executor(exec) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
            return yield changeDirectory_1.ChangeDirectory.Async({
                absoluteNewCurrentDirectory: yield getChangeDirectoryToWithThrow_1.getChangeDirectoryToWithThrow(changeDirTo, startingDirectory),
            }, (state) => tslib_1.__awaiter(this, void 0, void 0, function* () {
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
                        yield spawner_1.spawnerBlast(blast, false);
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
                                const config = yield fs.readJsonAsync('./package.json');
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
                            yield executor_sym_installer_1.moduleLinker({ commandText: `${commandText} --sym-uninstall`, argsIn: ['--uninstall'], noHeader: true });
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
                                yield spawnCaller(['uninstall'].concat(argsPass1), verbose);
                                yield spawnCaller(['install'].concat(argsPass2), verbose);
                            }
                            else if (dualPhaseMode === 'package-relink') {
                                yield spawnCaller(['uninstall', '-g'].concat(argsPass1), verbose);
                                yield spawnCaller(['link'].concat(argsPass2), verbose);
                            }
                            else {
                                const msg = `Unknown dual-phase-mode '${dualPhaseMode.red}'`;
                                logger_1.GlobalLogger.error(msg);
                                throw new Error(msg.strip);
                            }
                        }
                        else {
                            yield spawnCaller(argsPass1, verbose);
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
                            yield executor_sym_installer_1.moduleLinker({ commandText: `${commandText} --sym`, argsIn: [], noHeader: true });
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
                        yield spawner_1.spawnerLines(lineEnding, verbose);
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
            }));
        }
    });
}
exports.executor = executor;
