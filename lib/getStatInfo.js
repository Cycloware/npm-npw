"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0U3RhdEluZm8uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvZ2V0U3RhdEluZm8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxrQkFBZ0I7QUFFaEIsdUNBQXVDO0FBRXZDLHVDQUF3QztBQUd4QyxJQUFpQixXQUFXLENBNEczQjtBQTVHRCxXQUFpQixXQUFXO0lBK0IxQixzQkFBc0IsSUFBWSxFQUFFLEdBQVEsRUFBRSxLQUFhO1FBQ3pELE1BQU0sTUFBTSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQyxHQUFHLFdBQVcsR0FBRyxPQUFPLENBQTRCLENBQUM7UUFDNUYsSUFBSSxPQUFPLENBQUM7UUFDWixFQUFFLENBQUMsQ0FBQyxNQUFNLEtBQUssV0FBVyxDQUFDLENBQUMsQ0FBQztZQUMzQixPQUFPLEdBQUcsY0FBYyxJQUFJLGVBQWUsS0FBSyxJQUFJLENBQUM7UUFDdkQsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ04sT0FBTyxHQUFHLHdCQUF3QixLQUFLLFdBQVcsR0FBRyxHQUFHLENBQUM7UUFDM0QsQ0FBQztRQUNELE1BQU0sQ0FBQztZQUNMLE1BQU07WUFDTixPQUFPO1lBQ1AsSUFBSTtZQUNKLFdBQVcsRUFBRSxHQUFHO1NBQ2pCLENBQUE7SUFDSCxDQUFDO0lBRUQsdUJBQXVCLFFBQTBCLEVBQUUsT0FBYztRQUMvRCxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDaEQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2hDLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUMxQyxNQUFNLENBQUM7WUFDTCxXQUFXO1lBQ1gsTUFBTTtZQUNOLGNBQWM7WUFDZCxJQUFJLEVBQUUsV0FBVyxHQUFHLFdBQVcsR0FBRyxNQUFNLEdBQUcsTUFBTSxHQUFHLGNBQWMsR0FBRyxTQUFTLEdB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