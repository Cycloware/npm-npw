"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
    async function Async(args, action, errorProcessor = defaultErrorProcessor) {
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
            return await action(state);
        }
        catch (err) {
            return errorProcessor(err, _relativeNewCurrentDirectory);
        }
        finally {
            if (directoryWasChanged) {
                performDirectoryChange(_absoluteOldCurrentDirectory, _absoluteNewCurrentDirectory, _relativeNewCurrentDirectory, log, traceOutput);
            }
        }
    }
    ChangeDirectory.Async = Async;
})(ChangeDirectory = exports.ChangeDirectory || (exports.ChangeDirectory = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhbmdlRGlyZWN0b3J5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2NoYW5nZURpcmVjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDZCQUE2QjtBQUM3QixxQ0FBMEc7QUFFMUcscURBQWtEO0FBRWxELElBQWlCLGVBQWUsQ0F1Ry9CO0FBdkdELFdBQWlCLGVBQWU7SUFZOUIsZ0NBQWdDLDRCQUFvQyxFQUFFLDRCQUFvQyxFQUFFLDRCQUFvQyxFQUFFLEdBQW1CLEVBQUUsV0FBb0I7UUFDekwsSUFBSSxDQUFDO1lBQ0gsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLDRCQUE0QixFQUFFLDRCQUE0QixDQUFDLENBQUM7WUFDeEcsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztnQkFDaEIsR0FBRyxDQUFDLEtBQUssQ0FBQyx1Q0FBdUMscUJBQXFCLENBQUMsS0FBSyxLQUFLLDRCQUE0QixDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7WUFDekgsQ0FBQztZQUNELE9BQU8sQ0FBQyxLQUFLLENBQUMsNEJBQTRCLENBQUMsQ0FBQztRQUM5QyxDQUFDO1FBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNiLEdBQUcsQ0FBQyxLQUFLLENBQUMsNkNBQTZDLDRCQUE0QixDQUFDLEdBQUcsS0FBSyw0QkFBNEIsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFBO1lBQ2pJLE1BQU0sR0FBRyxDQUFDO1FBQ1osQ0FBQztJQUNILENBQUM7SUFRRCwrQkFBK0IsR0FBUSxFQUFFLFFBQWdCO1FBQ3ZELE1BQU0sTUFBTSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQyxHQUFHLFdBQVcsR0FBRyxPQUFPLENBQTRCLENBQUM7UUFDNUYsSUFBSSxPQUFPLENBQUM7UUFDWixFQUFFLENBQUMsQ0FBQyxNQUFNLEtBQUssV0FBVyxDQUFDLENBQUMs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