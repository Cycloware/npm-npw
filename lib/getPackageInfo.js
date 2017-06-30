"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
require("colors");
const ch = require("chalk");
const fs = require("fs-extra-promise");
// export namespace getPackageInfo {
//   export type TResult = TResultGood | TResultError;
// }
function getPackageInfo(packagePath) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        try {
            return { result: 'success', packageInfo: yield fs.readJSONAsync(packagePath) };
        }
        catch (err) {
            if (err.code === 'ENOENT') {
                return { result: 'not-found', err, message: `The package.json '${packagePath.gray}' was not found` };
            }
            else {
                return { result: 'error', err, message: `Error loading package.json '${packagePath.gray}'; err: ${ch.gray(err)}` };
            }
        }
    });
}
exports.getPackageInfo = getPackageInfo;
