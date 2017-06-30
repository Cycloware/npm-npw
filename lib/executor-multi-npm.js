"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
require("colors");
const chalk = require("chalk");
const spawner_1 = require("./npm/spawner");
const commandBuilder_1 = require("./commandBuilder");
const changeDirectory_1 = require("./changeDirectory");
const getChangeDirectoryToWithThrow_1 = require("./getChangeDirectoryToWithThrow");
const logger_1 = require("./logger");
function executor(exec) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
            .command(['--cd', '-cd', 'cd'], ({ toPass }) => {
            changeDirTo = toPass;
        }, {
            nArgs: 1,
        });
        const commandsResult = commands.processCommands(argsIn);
        const { actionsMatched, args: { toPass: argsToPass, toPassLead: argsToPassLead, toPassAdditional: argsToPassAdditional } } = commandsResult;
        return yield changeDirectory_1.ChangeDirectory.Async({
            absoluteNewCurrentDirectory: yield getChangeDirectoryToWithThrow_1.getChangeDirectoryToWithThrow(changeDirTo, startingDirectory),
        }, (state) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                if (global) {
                    logger_1.GlobalLogger.info(`In ${'global mode'.yellow}...`);
                }
                let spawnCaller = spawner_1.spawnerNpm;
                let executionBlocks = 0;
                if (argsToPass.length > 0) {
                    let argsPass1 = [].concat(argsToPassLead).concat(argsToPass).concat(argsToPassAdditional);
                    let allArgs = argsToPass.map(p => [].concat(argsToNpm).concat(argsToPassLead).concat([p]).concat(argsToPassAdditional));
                    for (const argX of allArgs) {
                        yield spawnCaller(argX, verbose);
                    }
                }
                if (argsToPass.length < 1) {
                    const msg = `${commandText.cyan} mode requires at least a package name`;
                    logger_1.GlobalLogger.error(msg);
                    throw new Error(msg.strip);
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
    });
}
exports.executor = executor;
