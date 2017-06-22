"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("colors");
const fs = require("fs-extra-promise");
var getStatInfo;
(function (getStatInfo) {
    function Async(path, resolveLinks) {
        return fs.lstatAsync(path).then(lstatRet => {
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
                return fs.statAsync(path).then(statRet => {
                    resultRet.resolvedLink = {
                        isDirectory: statRet.isDirectory(),
                        isFile: statRet.isFile(),
                        isSymbolicLink: statRet.isSymbolicLink(),
                        stat: 'stat',
                        statRet
                    };
                    return resultRet;
                });
            }
            return resultRet;
        }).catch(err => {
            return {
                result: ((err.code === 'ENOENT') ? 'not-found' : 'error'),
                path,
                errorObject: err,
            };
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
                const statRet = fs.statSync(path);
                resultRet.resolvedLink = {
                    isDirectory: statRet.isDirectory(),
                    isFile: statRet.isFile(),
                    isSymbolicLink: statRet.isSymbolicLink(),
                    stat: 'stat',
                    statRet
                };
            }
            return resultRet;
        }
        catch (err) {
            return {
                result: ((err.code === 'ENOENT') ? 'not-found' : 'error'),
                path,
                errorObject: err,
            };
        }
    }
    getStatInfo.Sync = Sync;
})(getStatInfo = exports.getStatInfo || (exports.getStatInfo = {}));
