"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
require("colors");
// import * as Promise from 'bluebird';
const fs = require("fs-extra-promise");
var getStatInfo;
(function (getStatInfo) {
    function processError(path, err, stage) {
        const result = ((err.code === 'ENOENT') ? 'not-found' : 'error');
        let message;
        if (result === 'not-found') {
            message = `File path '${path} not found [${stage}].`;
        }
        else {
            message = `Other error occured [${stage}]; err: ${err}.`;
        }
        return {
            result,
            message,
            path,
            errorObject: err,
        };
    }
    function Async(path, resolveLinks) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                const lstatRet = yield fs.lstatAsync(path);
                const isSymbolicLink = lstatRet.isSymbolicLink();
                const resultRet = {
                    result: 'stat-returned',
                    path,
                    isDirectory: lstatRet.isDirectory(),
                    isFile: lstatRet.isFile(),
                    isSymbolicLink,
                    resolveLinks,
                    stat: 'lstat',
                    statRet: lstatRet,
                };
                if (resolveLinks && isSymbolicLink) {
                    try {
                        const statRet = yield fs.statAsync(path);
                        resultRet.resolvedLink = {
                            isDirectory: statRet.isDirectory(),
                            isFile: statRet.isFile(),
                            isSymbolicLink: statRet.isSymbolicLink(),
                            stat: 'stat',
                            statRet
                        };
                        return resultRet;
                    }
                    catch (err) {
                        return processError(path, err, '2-stat-link-resolve');
                    }
                }
                return resultRet;
            }
            catch (err) {
                return processError(path, err, '1-lstat');
            }
        });
    }
    getStatInfo.Async = Async;
    function Sync(path, resolveLinks) {
        try {
            const lstatRet = fs.lstatSync(path);
            const resultRet = {
                result: 'stat-returned',
                path,
                isDirectory: lstatRet.isDirectory(),
                isFile: lstatRet.isFile(),
                isSymbolicLink: lstatRet.isSymbolicLink(),
                resolveLinks,
                stat: 'lstat',
                statRet: lstatRet,
            };
            if (resolveLinks && resultRet.isSymbolicLink) {
                try {
                    const statRet = fs.statSync(path);
                    resultRet.resolvedLink = {
                        isDirectory: statRet.isDirectory(),
                        isFile: statRet.isFile(),
                        isSymbolicLink: statRet.isSymbolicLink(),
                        stat: 'stat',
                        statRet
                    };
                }
                catch (err) {
                    return processError(path, err, '2-stat-link-resolve');
                }
            }
            return resultRet;
        }
        catch (err) {
            return processError(path, err, '1-lstat');
        }
    }
    getStatInfo.Sync = Sync;
})(getStatInfo = exports.getStatInfo || (exports.getStatInfo = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0U3RhdEluZm8uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvZ2V0U3RhdEluZm8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsa0JBQWdCO0FBRWhCLHVDQUF1QztBQUV2Qyx1Q0FBd0M7QUFHeEMsSUFBaUIsV0FBVyxDQXVIM0I7QUF2SEQsV0FBaUIsV0FBVztJQTZCMUIsc0JBQXNCLElBQVksRUFBRSxHQUFRLEVBQUUsS0FBYTtRQUN6RCxNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksS0FBSyxRQUFRLENBQUMsR0FBRyxXQUFXLEdBQUcsT0FBTyxDQUE0QixDQUFDO1FBQzVGLElBQUksT0FBTyxDQUFDO1FBQ1osRUFBRSxDQUFDLENBQUMsTUFBTSxLQUFLLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDM0IsT0FBTyxHQUFHLGNBQWMsSUFBSSxlQUFlLEtBQUssSUFBSSxDQUFDO1FBQ3ZELENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNOLE9BQU8sR0FBRyx3QkFBd0IsS0FBSyxXQUFXLEdBQUcsR0FBRyxDQUFDO1FBQzNELENBQUM7UUFDRCxNQUFNLENBQUM7WUFDTCxNQUFNO1lBQ04sT0FBTztZQUNQLElBQUk7WUFDSixXQUFXLEVBQUUsR0FBRztTQUNqQixDQUFBO0lBQ0gsQ0FBQztJQUVELGVBQTRCLElBQVksRUFBRSxZQUFxQjs7WUFDN0QsSUFBSSxDQUFDO2dCQUNILE1BQU0sUUFBUSxHQUFHLE1BQU0sRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDMUMsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUNqRCxNQUFNLFNBQVMsR0FBZ0I7b0JBQzdCLE1BQU0sRUFBRSxlQUFlO29CQUN2QixJQUFJO29CQUNKLFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVyxFQUFFO29CQUNuQyxNQUFNLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRTtv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