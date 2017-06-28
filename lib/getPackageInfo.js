"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("colors");
const ch = require("chalk");
const fs = require("fs-extra-promise");
// export namespace getPackageInfo {
//   export type TResult = TResultGood | TResultError;
// }
async function getPackageInfo(packagePath) {
    try {
        return { result: 'success', packageInfo: await fs.readJSONAsync(packagePath) };
    }
    catch (err) {
        if (err.code === 'ENOENT') {
            return { result: 'not-found', err, message: `The package.json '${packagePath.gray}' was not found` };
        }
        else {
            return { result: 'error', err, message: `Error loading package.json '${packagePath.gray}'; err: ${ch.gray(err)}` };
        }
    }
}
exports.getPackageInfo = getPackageInfo;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0UGFja2FnZUluZm8uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvZ2V0UGFja2FnZUluZm8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxrQkFBZ0I7QUFDaEIsNEJBQTZCO0FBRTdCLHVDQUF3QztBQUV4QyxvQ0FBb0M7QUFDcEMsc0RBQXNEO0FBQ3RELElBQUk7QUFFRyxLQUFLLHlCQUF5QixXQUFtQjtJQUN0RCxJQUFJLENBQUM7UUFDSCxNQUFNLENBQUMsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztJQUNqRixDQUFDO0lBQ0QsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNYLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQztZQUMxQixNQUFNLENBQUMsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUscUJBQXFCLFdBQVcsQ0FBQyxJQUFJLGlCQUFpQixFQUFFLENBQUE7UUFDdEcsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ04sTUFBTSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLCtCQUErQixXQUFXLENBQUMsSUFBSSxXQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFBO1FBQ3BILENBQUM7SUFDSCxDQUFDO0FBQ0gsQ0FBQztBQVhELHdDQVdDIn0=