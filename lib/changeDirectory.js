"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const path = require("path");
const logger_1 = require("./logger");
const stringComparer_1 = require("./stringComparer");
var ChangeDirectory;
(function (ChangeDirectory) {
    function performDirectoryChange(_absoluteOldCurrentDirectory, _absoluteNewCurrentDirectory, _relativeNewCurrentDirectory, log, traceOutput) {
        try {
            const relativeOldWorkingDir = path.relative(_absoluteNewCurrentDirectory, _absoluteOldCurrentDirectory);
            if (traceOutput) {
                log.trace(` + Changing Current Directory back: ${relativeOldWorkingDir.green} [${_absoluteNewCurrentDirectory.gray}]`);
            }
            process.chdir(_absoluteOldCurrentDirectory);
        }
        catch (err) {
            log.error(` + Error Changing Current Directory back: ${_absoluteOldCurrentDirectory.red} [${_absoluteNewCurrentDirectory.gray}]`);
            throw err;
        }
    }
    function defaultErrorProcessor(err, filepath) {
        const result = ((err.code === 'ENOENT') ? 'not-found' : 'error');
        let message;
        if (result === 'not-found') {
            message = `Cannot change directory to '${filepath}' because it was not found.`;
        }
        else {
            message = `Other error occured with changing directory to '${filepath}'; err: ${err}.`;
        }
        return {
            result,
            message,
            path: filepath,
            errorObject: err,
        };
    }
    function Async(args, action, errorProcessor = defaultErrorProcessor) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let directoryWasChanged = false;
            let _absoluteOldCurrentDirectory;
            let _absoluteNewCurrentDirectory;
            let _relativeNewCurrentDirectory;
            let log = logger_1.GlobalLogger;
            let traceOutput = true;
            try {
                const { absoluteNewCurrentDirectory, currentDirectoryOverride = process.cwd(), caseSensitive = true, } = args;
                if (args.traceOutput === false) {
                    traceOutput = false;
                }
                if (args.log) {
                    log = args.log;
                }
                const comparer = stringComparer_1.stringComparer.get(caseSensitive);
                const absoluteOldCurrentDirectory = currentDirectoryOverride;
                _absoluteOldCurrentDirectory = absoluteOldCurrentDirectory;
                _absoluteNewCurrentDirectory = absoluteNewCurrentDirectory;
                const directoryShouldChange = !comparer(absoluteNewCurrentDirectory, absoluteOldCurrentDirectory);
                const relativeNewCurrentDirectory = path.relative(absoluteOldCurrentDirectory, absoluteNewCurrentDirectory);
                if (directoryShouldChange) {
                    if (traceOutput) {
                        log.trace(` + Changing Current Directory: ${relativeNewCurrentDirectory.green} [${absoluteNewCurrentDirectory.gray}]`);
                    }
                    process.chdir(absoluteNewCurrentDirectory);
                    directoryWasChanged = true;
                }
                const state = {
                    currentDirectory: {
                        old: absoluteOldCurrentDirectory,
                        new: absoluteNewCurrentDirectory,
                    },
                    changed: directoryWasChanged,
                    caseSensitive,
                    relativeNewCurrentDirectory,
                };
                return yield action(state);
            }
            catch (err) {
                return errorProcessor(err, _relativeNewCurrentDirectory);
            }
            finally {
                if (directoryWasChanged) {
                    performDirectoryChange(_absoluteOldCurrentDirectory, _absoluteNewCurrentDirectory, _relativeNewCurrentDirectory, log, traceOutput);
                }
            }
        });
    }
    ChangeDirectory.Async = Async;
})(ChangeDirectory = exports.ChangeDirectory || (exports.ChangeDirectory = {}));
