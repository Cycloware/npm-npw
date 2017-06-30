"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
require("colors");
const chalk = require("chalk");
const fs = require("fs-extra-promise");
const path = require("path");
const unquote_1 = require("./unquote");
const logger_1 = require("./logger");
function getChangeDirectoryToWithThrow(changeDirTo, startingDirectory) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
                    if (yield fs.existsAsync(absoluteChangeDirectoryTo)) {
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
    });
}
exports.getChangeDirectoryToWithThrow = getChangeDirectoryToWithThrow;
