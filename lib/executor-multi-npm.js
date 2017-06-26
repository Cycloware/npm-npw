"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("colors");
const chalk = require("chalk");
const spawner_1 = require("./npm/spawner");
const isRoot = require("is-root");
const commandBuilder_1 = require("./commandBuilder");
const changeDirectory_1 = require("./changeDirectory");
const getChangeDirectoryToWithThrow_1 = require("./getChangeDirectoryToWithThrow");
const logger_1 = require("./logger");
const executingAsRoot = isRoot();
if (executingAsRoot) {
    logger_1.GlobalLogger.trace(`Running as:  ${executingAsRoot ? 'SUDO'.red : 'normal user'.green}`);
}
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
        .command(['--cd', '-cd', 'cd'], (nArgs) => {
        changeDirTo = nArgs;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0b3ItbXVsdGktbnBtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2V4ZWN1dG9yLW11bHRpLW5wbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLGtCQUFnQjtBQUVoQiwrQkFBZ0M7QUFFaEMsMkNBQW1GO0FBT25GLGtDQUFtQztBQUVuQyxxREFBa0Q7QUFDbEQsdURBQW9EO0FBRXBELG1GQUFnRjtBQUdoRixxQ0FBZ0Q7QUFFaEQsTUFBTSxlQUFlLEdBQUcsTUFBTSxFQUFFLENBQUM7QUFDakMsRUFBRSxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztJQUNwQixxQkFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsZUFBZSxHQUFHLE1BQU0sQ0FBQyxHQUFHLEdBQUcsYUFBYSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7QUFDbEYsQ0FBQztBQUVNLEtBQUssbUJBQW1CLElBQTJGO0lBRXhILElBQUksRUFBRSxXQUFXLEVBQUUsTUFBTSxHQUFHLEVBQUUsRUFBRSxRQUFRLEdBQUcsRUFBRSxFQUFFLFNBQVMsR0FBRyxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUM7SUFDdkUsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLE1BQU0sR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNqQyxDQUFDO0lBQUMsSUFBSSxDQUFDLENBQUM7UUFDTixFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDMUIsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMvQyxDQUFDO0lBQ0gsQ0FBQztJQUVELElBQUksT0FBTyxHQUFHLElBQUksQ0FBQztJQUNuQixJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUM7SUFFbEIsSUFBSSxXQUFXLEdBQWEsU0FBUyxDQUFDO0lBQ3RDLE1BQU0saUJBQWlCLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBRXhDLE1BQU0sUUFBUSxHQUFHLCtCQUFjLENBQUMsS0FBSyxFQUFFO1NBQ3BDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLEVBQzlCLENBQUMsS0FBSztRQUNKLFdBQVcsR0FBRyxLQUFLLENBQUM7SUFDdEIsQ0FBQyxFQUFFO1FBQ0QsS0FBSyxFQUFFLENBQUM7S0FDVCxDQUFDLENBQUE7SUFFSixNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3hELE1BQU0sRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsY0FBYyxFQUFFLGdCQUFnQixFQUFFLG9CQUFvQixFQUFFLEVBQUUsR0FBRyxjQUFjLENBQUM7SUFFNUksTUFBTSxDQUFDLE1BQU0saUNBQWUsQ0FBQyxLQUFLLENBQUM7UUFDakMsMkJBQTJCLEVBQUUsTUFBTSw2REFBNkIsQ0FBQyxXQUFXLEVBQUUsaUJBQWlCLENBQUM7S0FDakcsRUFBRSxLQUFLLEVBQUUsS0FBSztRQUNiLElBQUksQ0FBQztZQUNILEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0JBQ1gscUJBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxhQUFhLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQztZQUM3QyxDQUFDO1lBRUQsSUFBSSxXQUFXLEdBQUcsb0JBQVUsQ0FBQztZQUM3QixJQUFJLGVBQWUsR0FBRyxDQUFDLENBQUM7WUFFeEIsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMxQixJQUFJLFNBQVMsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsQ0FBQztnQkFFMUYsSUFBSSxPQUFPLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFBO2dCQUV2SCxHQUFHLENBQUMsQ0FBQyxNQUFNLElBQUksSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDO29CQUMzQixNQUFNLFdBQVcsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBQ25DLENBQUM7WUFDSCxDQUFDO1lBR0QsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMxQixNQUFNLEdBQUcsR0FBRyxHQUFHLFdBQVcsQ0FBQyxJQUFJLHdDQUF3QyxDQUFDO2dCQUN4RSxxQkFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDaEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDNUIsQ0FBQztZQUVELEVBQUUsQ0FBQyxDQUFDLGVBQWUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMxQixxQkFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLHVCQUF1QixDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFDakQsQ0FBQztZQUVELE1BQU0sQ0FBQyxVQUFVLENBQUM7UUFDcEIsQ0FBQztRQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDYixNQUFNLEdBQUcsR0FBRyxHQUFHLHNCQUFzQixDQUFDLEdBQUcsS0FBSyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3hFLHFCQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzdCLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFuRUQsNEJBbUVDIn0=