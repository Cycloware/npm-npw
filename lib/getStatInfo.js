"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
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
    function Async(path, resolveLinks) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                const lstatRet = yield fs.lstatAsync(path);
                const resultRet = Object.assign({ result: 'stat-returned', path }, infoFromStats('lstat', lstatRet), { resolveLinks });
                if (resolveLinks && lstatRet.isSymbolicLink) {
                    try {
                        const statRet = yield fs.statAsync(path);
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
        });
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
