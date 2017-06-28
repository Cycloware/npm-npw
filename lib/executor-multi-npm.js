"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("colors");
const chalk = require("chalk");
const spawner_1 = require("./npm/spawner");
const commandBuilder_1 = require("./commandBuilder");
const changeDirectory_1 = require("./changeDirectory");
const getChangeDirectoryToWithThrow_1 = require("./getChangeDirectoryToWithThrow");
const logger_1 = require("./logger");
async function executor(exec) {
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
    return await changeDirectory_1.ChangeDirectory.Async({
        absoluteNewCurrentDirectory: await getChangeDirectoryToWithThrow_1.getChangeDirectoryToWithThrow(changeDirTo, startingDirectory),
    }, async (state) => {
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
                    await spawnCaller(argX, verbose);
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
    });
}
exports.executor = executor;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0b3ItbXVsdGktbnBtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2V4ZWN1dG9yLW11bHRpLW5wbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLGtCQUFnQjtBQUVoQiwrQkFBZ0M7QUFFaEMsMkNBQW1GO0FBT25GLHFEQUFrRDtBQUNsRCx1REFBb0Q7QUFFcEQsbUZBQWdGO0FBR2hGLHFDQUFnRDtBQUV6QyxLQUFLLG1CQUFtQixJQUEyRjtJQUV4SCxJQUFJLEVBQUUsV0FBVyxFQUFFLE1BQU0sR0FBRyxFQUFFLEVBQUUsUUFBUSxHQUFHLEVBQUUsRUFBRSxTQUFTLEdBQUcsRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDO0lBQ3ZFLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4QixNQUFNLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakMsQ0FBQztJQUFDLElBQUksQ0FBQyxDQUFDO1FBQ04sRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzFCLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDL0MsQ0FBQztJQUNILENBQUM7SUFFRCxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUM7SUFDbkIsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDO0lBRWxCLElBQUksV0FBVyxHQUFhLFNBQVMsQ0FBQztJQUN0QyxNQUFNLGlCQUFpQixHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUV4QyxNQUFNLFFBQVEsR0FBRywrQkFBYyxDQUFDLEtBQUssRUFBRTtTQUNwQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxFQUM5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