"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("colors");
const chalk = require("chalk");
const fs = require("fs-extra-promise");
const path = require("path");
const unquote_1 = require("./unquote");
const logger_1 = require("./logger");
async function getChangeDirectoryToWithThrow(changeDirTo, startingDirectory) {
    if (changeDirTo) {
        if (changeDirTo.length < 1) {
            const msg = `${'Error:'.red}  option '${'--cd'.red}' must be followed by a relative or absolute path.`;
            logger_1.GlobalLogger.error(msg);
            throw new Error(msg.strip);
        }
        else {
            const rawDir = changeDirTo[0];
            const inputDir = unquote_1.unquote(rawDir);
            const isInputChangeDirectoryRelative = !path.isAbsolute(inputDir);
            const absoluteChangeDirectoryTo = path.resolve(startingDirectory, inputDir);
            try {
                if (await fs.existsAsync(absoluteChangeDirectoryTo)) {
                    logger_1.GlobalLogger.info(`Changing working directory to '${inputDir.yellow}'`);
                    return absoluteChangeDirectoryTo;
                }
                else {
                    const msg = `${'Cannot change directory to:'.red}  '${inputDir.black.bgWhite}', please ensure it exists${isInputChangeDirectoryRelative ? `, absolutePath '${absoluteChangeDirectoryTo.black.bgWhite}', currentDirectory: ${startingDirectory.black.bgWhite}'` : ''}`;
                    logger_1.GlobalLogger.error(msg);
                    throw new Error(msg.strip);
                }
            }
            catch (err) {
                const msg = `${'Cannot change directory to:'.red}  '${inputDir.black.bgWhite}', please ensure it exists${isInputChangeDirectoryRelative ? `, absolutePath '${absoluteChangeDirectoryTo.black.bgWhite}', currentDirectory: ${startingDirectory.black.bgWhite}'` : ''}; Error: ${chalk.red(err)}`;
                logger_1.GlobalLogger.error(msg);
                throw new Error(msg.strip);
            }
        }
    }
    else {
        return startingDirectory;
    }
}
exports.getChangeDirectoryToWithThrow = getChangeDirectoryToWithThrow;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0Q2hhbmdlRGlyZWN0b3J5VG9XaXRoVGhyb3cuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvZ2V0Q2hhbmdlRGlyZWN0b3J5VG9XaXRoVGhyb3cudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxrQkFBZ0I7QUFDaEIsK0JBQWdDO0FBQ2hDLHVDQUF3QztBQUN4Qyw2QkFBOEI7QUFFOUIsdUNBQW9DO0FBRXBDLHFDQUFpRDtBQUUxQyxLQUFLLHdDQUF3QyxXQUFxQixFQUFFLGlCQUF5QjtJQUNsRyxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQ2hCLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMzQixNQUFNLEdBQUcsR0FBRyxHQUFHLFFBQVEsQ0FBQyxHQUFHLGFBQWEsTUFBTSxDQUFDLEdBQUcsb0RBQW9ELENBQUM7WUFDdkcscUJBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDZixNQUFNLElBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM3QixDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDTixNQUFNLE1BQU0sR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDOUIsTUFBTSxRQUFRLEdBQUcsaUJBQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNqQyxNQUFNLDhCQUE4QixHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNsRSxNQUFNLHlCQUF5QixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsaUJBQWlCLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDNUUsSUFBSSxDQUFDO2dCQUVILEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLFdBQVcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDcEQscUJBQUksQ0FBQyxJQUFJLENBQUMsa0NBQWtDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO29CQUNoRSxNQUFNLENBQUMseUJBQXlCLENBQUM7Z0JBRW5DLENBQUM7Z0JBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ04sTUFBTSxHQUFHLEdBQUcsR0FBRyw2QkFBNkIsQ0FBQyxHQUFHLE1BQU0sUUFBUSxDQUFDLEtBQUssQ0FBQyxPQUFPLDZCQUE2Qiw4QkFBOEIsR0FBRyxtQkFBbUIseUJBQXlCLENBQUMsS0FBSyxDQUFDLE9BQU8sd0JBQXdCLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsR0FBRyxFQUFFLEVBQUUsQ0FBQztvQkFDdFEscUJBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7b0JBQ2YsTUFBTSxJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQzdCLENBQUM7WUFDSCxDQUFDO1lBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDYixNQUFNLEdBQUcsR0FBRyxHQUFHLDZCQUE2QixDQUFDLEdBQUcsTUFBTSxRQUFRLENBQUMsS0FBSyxDQUFDLE9BQU8sNkJBQTZCLDhCQUE4QixHQUFHLG1CQUFtQix5QkFBeUIsQ0FBQyxLQUFLLENBQUMsT0FBTyx3QkFBd0IsaUJBQWlCLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxHQUFHLEVBQUUsWUFBWSxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ2hTLHFCQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO2dCQUNmLE1BQU0sSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzdCLENBQUM7UUFDSCxDQUFDO0lBQ0gsQ0FBQztJQUFDLElBQUksQ0FBQyxDQUFDO1FBQ04sTUFBTSxDQUFDLGlCQUFpQixDQUFBO0lBQzFCLENBQUM7QUFDSCxDQUFDO0FBL0JELHNFQStCQyJ9