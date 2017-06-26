"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const logger_1 = require("./logger");
const stringComparer_1 = require("./stringComparer");
var ChangeDirectory;
(function (ChangeDirectory) {
    function performDirectoryChange(_absoluteOldCurrentDirectory, _absoluteNewCurrentDirectory, _relativeNewCurrentDirectory, log) {
        try {
            const relativeOldWorkingDir = path.relative(_absoluteNewCurrentDirectory, _absoluteOldCurrentDirectory);
            log.trace(` + Changing Current Directory back: ${relativeOldWorkingDir.green} [${_absoluteNewCurrentDirectory.gray}]`);
            process.chdir(_absoluteOldCurrentDirectory);
        }
        catch (err) {
            log.error(` + Error Changing Current Directory back: ${_absoluteOldCurrentDirectory.red} [${_absoluteNewCurrentDirectory.gray}]`);
            throw err;
        }
    }
    async function Async(args, action) {
        let directoryWasChanged = false;
        let _absoluteOldCurrentDirectory;
        let _absoluteNewCurrentDirectory;
        let _relativeNewCurrentDirectory;
        let log = logger_1.GlobalLogger;
        try {
            const { absoluteNewCurrentDirectory, currentDirectoryOverride = process.cwd(), caseSensitive = true } = args;
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
                log.trace(` + Changing Current Directory: ${relativeNewCurrentDirectory.green} [${absoluteNewCurrentDirectory.gray}]`);
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
        finally {
            if (directoryWasChanged) {
                performDirectoryChange(_absoluteOldCurrentDirectory, _absoluteNewCurrentDirectory, _relativeNewCurrentDirectory, log);
            }
        }
    }
    ChangeDirectory.Async = Async;
})(ChangeDirectory = exports.ChangeDirectory || (exports.ChangeDirectory = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhbmdlRGlyZWN0b3J5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2NoYW5nZURpcmVjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDZCQUE2QjtBQUM3QixxQ0FBMEc7QUFFMUcscURBQWtEO0FBRWxELElBQWlCLGVBQWUsQ0FzRS9CO0FBdEVELFdBQWlCLGVBQWU7SUFZOUIsZ0NBQWdDLDRCQUFvQyxFQUFFLDRCQUFvQyxFQUFFLDRCQUFvQyxFQUFFLEdBQW1CO1FBQ25LLElBQUksQ0FBQztZQUNILE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSw0QkFBNEIsQ0FBQyxDQUFDO1lBQ3hHLEdBQUcsQ0FBQyxLQUFLLENBQUMsdUNBQXVDLHFCQUFxQixDQUFDLEtBQUssS0FBSyw0QkFBNEIsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO1lBQ3ZILE9BQU8sQ0FBQyxLQUFLLENBQUMsNEJBQTRCLENBQUMsQ0FBQztRQUM5QyxDQUFDO1FBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNiLEdBQUcsQ0FBQyxLQUFLLENBQUMsNkNBQTZDLDRCQUE0QixDQUFDLEdBQUcsS0FBSyw0QkFBNEIsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFBO1lBQ2pJLE1BQU0sR0FBRyxDQUFDO1FBQ1osQ0FBQztJQUNILENBQUM7SUFFTSxLQUFLLGdCQUF5QixJQUdwQyxFQUFFLE1BQTRDO1FBRTdDLElBQUksbUJBQW1CLEdBQUcsS0FBSyxDQUFDO1FBQ2hDLElBQUksNEJBQW9DLENBQUM7UUFDekMsSUFBSSw0QkFBb0MsQ0FBQztRQUN6QyxJQUFJLDRCQUFvQyxDQUFDO1FBQ3pDLElBQUksR0FBRyxHQUFHLHFCQUFZLENBQUM7UUFDdkIsSUFBSSxDQUFDO1lBQ0gsTUFBTSxFQUFFLDJCQUEyQixFQUFFLHdCQUF3QixHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFDM0UsYUFBYSxHQUFHLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQztZQUVoQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDYixHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztZQUNqQixDQUFDO1lBRUQsTUFBTSxRQUFRLEdBQUcsK0JBQWMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDbkQsTUFBTSwyQkFBMkIsR0FBRyx3QkFBd0IsQ0FBQztZQUM3RCw0QkFBNEIsR0FBRywyQkFBMkIsQ0FBQztZQUMzRCw0QkFBNEIsR0FBRywyQkFBMkIsQ0FBQztZQUUzRCxNQUFNLHFCQUFxQixHQUFHLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLDJCQUEyQixDQUFDLENBQUM7WUFDbEcsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLDJCQUEyQixDQUFDLENBQUM7WUFDNUcsRUFBRSxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDO2dCQUMxQixHQUFHLENBQUMsS0FBSyxDQUFDLGtDQUFrQywyQkFBMkIsQ0FBQyxLQUFLLEtBQUssMkJBQTJCLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQztnQkFDdkgsT0FBTyxDQUFDLEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO2dCQUMzQyxtQkFBbUIsR0FBRyxJQUFJLENBQUM7WUFDN0IsQ0FBQztZQUVELE1BQU0sS0FBSyxHQUFXO2dCQUNwQixnQkFBZ0IsRUFBRTtvQkFDaEIsR0FBRyxFQUFFLDJCQUEyQjtvQkFDaEMsR0FBRyxFQUFFLDJCQUEyQjtpQkFDakM7Z0JBQ0QsT0FBTyxFQUFFLG1CQUFtQjtnQkFDNUIsYUFBYTtnQkFDYiwyQkFBMkI7YUFDNUIsQ0FBQTtZQUNELE1BQU0sQ0FBQyxNQUFNLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM3QixDQUFDO2dCQUFTLENBQUM7WUFDVCxFQUFFLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hCLHNCQUFzQixDQUFDLDRCQUE0QixFQUFFLDRCQUE0QixFQUFFLDRCQUE0QixFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3hILENBQUM7UUFDSCxDQUFDO0lBQ0gsQ0FBQztJQTlDcUIscUJBQUssUUE4QzFCLENBQUE7QUFDSCxDQUFDLEVBdEVnQixlQUFlLEdBQWYsdUJBQWUsS0FBZix1QkFBZSxRQXNFL0IifQ==