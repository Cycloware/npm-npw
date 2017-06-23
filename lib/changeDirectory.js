"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
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
    function Async(args, action) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
                return yield action(state);
            }
            finally {
                if (directoryWasChanged) {
                    performDirectoryChange(_absoluteOldCurrentDirectory, _absoluteNewCurrentDirectory, _relativeNewCurrentDirectory, log);
                }
            }
        });
    }
    ChangeDirectory.Async = Async;
})(ChangeDirectory = exports.ChangeDirectory || (exports.ChangeDirectory = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhbmdlRGlyZWN0b3J5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2NoYW5nZURpcmVjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2QkFBNkI7QUFDN0IscUNBQTBHO0FBRTFHLHFEQUFrRDtBQUVsRCxJQUFpQixlQUFlLENBc0UvQjtBQXRFRCxXQUFpQixlQUFlO0lBWTlCLGdDQUFnQyw0QkFBb0MsRUFBRSw0QkFBb0MsRUFBRSw0QkFBb0MsRUFBRSxHQUFtQjtRQUNuSyxJQUFJLENBQUM7WUFDSCxNQUFNLHFCQUFxQixHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsNEJBQTRCLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztZQUN4RyxHQUFHLENBQUMsS0FBSyxDQUFDLHVDQUF1QyxxQkFBcUIsQ0FBQyxLQUFLLEtBQUssNEJBQTRCLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQztZQUN2SCxPQUFPLENBQUMsS0FBSyxDQUFDLDRCQUE0QixDQUFDLENBQUM7UUFDOUMsQ0FBQztRQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDYixHQUFHLENBQUMsS0FBSyxDQUFDLDZDQUE2Qyw0QkFBNEIsQ0FBQyxHQUFHLEtBQUssNEJBQTRCLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQTtZQUNqSSxNQUFNLEdBQUcsQ0FBQztRQUNaLENBQUM7SUFDSCxDQUFDO0lBRUQsZUFBcUMsSUFHcEMsRUFBRSxNQUE0Qzs7WUFFN0MsSUFBSSxtQkFBbUIsR0FBRyxLQUFLLENBQUM7WUFDaEMsSUFBSSw0QkFBb0MsQ0FBQztZQUN6QyxJQUFJLDRCQUFvQyxDQUFDO1lBQ3pDLElBQUksNEJBQW9DLENBQUM7WUFDekMsSUFBSSxHQUFHLEdBQUcscUJBQVksQ0FBQztZQUN2QixJQUFJLENBQUM7Z0JBQ0gsTUFBTSxFQUFFLDJCQUEyQixFQUFFLHdCQUF3QixHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFDM0UsYUFBYSxHQUFHLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQztnQkFFaEMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQ2IsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7Z0JBQ2pCLENBQUM7Z0JBRUQsTUFBTSxRQUFRLEdBQUcsK0JBQWMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBQ25ELE1BQU0sMkJBQTJCLEdBQUcsd0JBQXdCLENBQUM7Z0JBQzdELDRCQUE0QixHQUFHLDJCQUEyQixDQUFDO2dCQUMzRCw0QkFBNEIsR0FBRywyQkFBMkIsQ0FBQztnQkFFM0QsTUFBTSxxQkFBcUIsR0FBRyxDQUFDLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO2dCQUNsRyxNQUFNLDJCQUEyQixHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsMkJBQTJCLEVBQUUsMkJBQTJCLENBQUMsQ0FBQztnQkFDNUcsRUFBRSxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDO29CQUMxQixHQUFHLENBQUMsS0FBSyxDQUFDLGtDQUFrQywyQkFBMkIsQ0FBQyxLQUFLLEtBQUssMkJBQTJCLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQztvQkFDdkgsT0FBTyxDQUFDLEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO29CQUMzQyxtQkFBbUIsR0FBRyxJQUFJLENBQUM7Z0JBQzdCLENBQUM7Z0JBRUQsTUFBTSxLQUFLLEdBQVc7b0JBQ3BCLGdCQUFnQixFQUFFO3dCQUNoQixHQUFHLEVBQUUsMkJBQTJCO3dCQUNoQyxHQUFHLEVBQUUsMkJBQTJCO3FCQUNqQztvQkFDRCxPQUFPLEVBQUUsbUJBQW1CO29CQUM1QixhQUFhO29CQUNiLDJCQUEyQjtpQkFDNUIsQ0FBQTtnQkFDRCxNQUFNLENBQUMsTUFBTSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDN0IsQ0FBQztvQkFBUyxDQUFDO2dCQUNULEVBQUUsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQztvQkFDeEIsc0JBQXNCLENBQUMsNEJBQTRCLEVBQUUsNEJBQTRCLEVBQUUsNEJBQTRCLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQ3hILENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztLQUFBO0lBOUNxQixxQkFBSyxRQThDMUIsQ0FBQTtBQUNILENBQUMsRUF0RWdCLGVBQWUsR0FBZix1QkFBZSxLQUFmLHVCQUFlLFFBc0UvQiJ9