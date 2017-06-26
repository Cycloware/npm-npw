"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("colors");
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
    function infoFromStats(statType, statRet) {
        const isSymbolicLink = statRet.isSymbolicLink();
        const isFile = statRet.isFile();
        const isDirectory = statRet.isDirectory();
        return {
            isDirectory,
            isFile,
            isSymbolicLink,
            type: isDirectory ? 'directory' : isFile ? 'file' : isSymbolicLink ? 'symlink' : 'unknown',
            stat: statType,
            statRet,
        };
    }
    async function Async(path, resolveLinks) {
        try {
            const lstatRet = await fs.lstatAsync(path);
            const resultRet = Object.assign({ result: 'stat-returned', path }, infoFromStats('lstat', lstatRet), { resolveLinks });
            if (resolveLinks && lstatRet.isSymbolicLink) {
                try {
                    const statRet = await fs.statAsync(path);
                    resultRet.resolvedLink = infoFromStats('stat', statRet);
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
    getStatInfo.Async = Async;
    function Sync(path, resolveLinks) {
        try {
            const lstatRet = fs.lstatSync(path);
            const resultRet = Object.assign({ result: 'stat-returned', path }, infoFromStats('lstat', lstatRet), { resolveLinks });
            if (resolveLinks && resultRet.isSymbolicLink) {
                try {
                    const statRet = fs.statSync(path);
                    resultRet.resolvedLink = infoFromStats('stat', statRet);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0U3RhdEluZm8uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvZ2V0U3RhdEluZm8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxrQkFBZ0I7QUFHaEIsdUNBQXdDO0FBR3hDLElBQWlCLFdBQVcsQ0E0RzNCO0FBNUdELFdBQWlCLFdBQVc7SUErQjFCLHNCQUFzQixJQUFZLEVBQUUsR0FBUSxFQUFFLEtBQWE7UUFDekQsTUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEtBQUssUUFBUSxDQUFDLEdBQUcsV0FBVyxHQUFHLE9BQU8sQ0FBNEIsQ0FBQztRQUM1RixJQUFJLE9BQU8sQ0FBQztRQUNaLEVBQUUsQ0FBQyxDQUFDLE1BQU0sS0FBSyxXQUFXLENBQUMsQ0FBQyxDQUFDO1lBQzNCLE9BQU8sR0FBRyxjQUFjLElBQUksZUFBZSxLQUFLLElBQUksQ0FBQztRQUN2RCxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDTixPQUFPLEdBQUcsd0JBQXdCLEtBQUssV0FBVyxHQUFHLEdBQUcsQ0FBQztRQUMzRCxDQUFDO1FBQ0QsTUFBTSxDQUFDO1lBQ0wsTUFBTTtZQUNOLE9BQU87WUFDUCxJQUFJO1lBQ0osV0FBVyxFQUFFLEdBQUc7U0FDakIsQ0FBQTtJQUNILENBQUM7SUFFRCx1QkFBdUIsUUFBMEIsRUFBRSxPQUFjO1FBQy9ELE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUNoRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDaEMsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzFDLE1BQU0sQ0FBQztZQUNMLFdBQVc7WUFDWCxNQUFNO1lBQ04sY0FBYztZQUNkLElBQUksRUFBRSxXQUFXLEdBQUcsV0FBVyxHQUFHLE1BQU0sR0FBRyxNQUFNLEdBQUcsY0FBYyxHQUFHLFNBQVMsR0FBRyxTQUFTO1lBQzFG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