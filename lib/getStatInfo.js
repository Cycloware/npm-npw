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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0U3RhdEluZm8uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvZ2V0U3RhdEluZm8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxrQkFBZ0I7QUFJaEIsdUNBQXdDO0FBR3hDLElBQWlCLFdBQVcsQ0F1RzNCO0FBdkdELFdBQWlCLFdBQVc7SUE0QjFCLGVBQXNCLElBQVksRUFBRSxZQUFxQjtRQUN2RCxNQUFNLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUTtZQUN0QyxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDakQsTUFBTSxTQUFTLEdBQWdCO2dCQUM3QixNQUFNLEVBQUUsZUFBZTtnQkFDdkIsSUFBSTtnQkFDSixXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVcsRUFBRTtnQkFDbkMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUU7Z0JBQ3pCLGNBQWM7Z0JBQ2QsWUFBWTtnQkFFWixJQUFJLEVBQUUsT0FBTztnQkFDYixPQUFPLEVBQUUsUUFBUTthQUNsQixDQUFBO1lBQ0QsRUFBRSxDQUFDLENBQUMsWUFBWSxJQUFJLGNBQWMsQ0FBQyxDQUFDLENBQUM7Z0JBQ25DLE1BQU0sQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPO29CQUNwQyxTQUFTLENBQUMsWUFBWSxHQUFHO3dCQUN2QixXQUFXLEVBQUUsT0FBTyxDQUFDLFdBQVcsRUFBRTt3QkFDbEMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNLEVBQUU7d0JBQ3hCLGNBQWMsRUFBRSxPQUFPLENBQUMsY0FBYyxFQUFFO3dCQUV4QyxJQUFJLEVBQUUsTUFBTTt3QkFDWixPQUFPO3FCQUVSLENBQUE7b0JBQ0QsTUFBTSxDQUFDLFNBQVMsQ0FBQztnQkFDbkIsQ0FBQyxDQUFDLENBQUE7WUFFSixDQUFDO1lBQ0QsTUFBTSxDQUFDLFNBQVMsQ0FBQztRQUNuQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRztZQUNWLE1BQU0sQ0FBQztnQkFDTCxNQUFNLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEtBQUssUUFBUSxDQUFDLEdBQUcsV0FBVyxHQUFHLE9BQU8sQ0FBNEI7Z0JBQ3BGLElBQUk7Z0JBQ0osV0FBVyxFQUFFLEdBQUc7YUFDakIsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO0lBQ0osQ0FBQztJQXJDZSxpQkFBSyxRQXFDcEIsQ0FBQTtJQUVELGNBQXFCLElBQVksRUFBRSxZQUFxQjtRQUV0RCxJQUFJLENBQUM7WUFDSCxNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3BDLE1BQU0sU0FBUyxHQUFnQjtnQkFDN0IsTUFBTSxFQUFFLGVBQWU7Z0JBQ3ZCLElBQUk7Z0JBQ0osV0FBVyxFQUFFLFFBQVEsQ0FBQyxXQUFXLEVBQUU7Z0JBQ25DLE1BQU0sRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFO2dCQUN6QixjQUFjLEVBQUUsUUFBUSxDQUFDLGNBQWMsRUFBRTtnQkFDekMsWUFBWTtnQkFFWixJQUFJLEVBQUUsT0FBTztnQkFDYixPQUFPLEVBQUUsUUFBUTthQUNsQixDQUFDO1lBRUYsRUFBRSxDQUFDLENBQUMsWUFBWSxJQUFJLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO2dCQUM3QyxNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNsQyxTQUFTLENBQUMsWUFBWSxHQUFHO29CQUN2QixXQUFXLEVBQUUsT0FBTyxDQUFDLFdBQVcsRUFBRTtvQkFDbEMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNLEVBQUU7b0JBQ3hCLGNBQWMsRUFBRSxPQUFPLENBQUMsY0FBYyxFQUFFO29CQUV4QyxJQUFJLEVBQUUsTUFBTTtvQkFDWixPQUFPO2lCQUNSLENBQUE7WUFDSCxDQUFDO1lBQ0QsTUFBTSxDQUFDLFNBQVMsQ0FBQztRQUNuQixDQUFDO1FBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNiLE1BQU0sQ0FBQztnQkFDTCxNQUFNLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEtBQUssUUFBUSxDQUFDLEdBQUcsV0FBVyxHQUFHLE9BQU8sQ0FBNEI7Z0JBQ3BGLElBQUk7Z0JBQ0osV0FBVyxFQUFFLEdBQUc7YUFDakIsQ0FBQTtRQUNILENBQUM7SUFDSCxDQUFDO0lBbkNlLGdCQUFJLE9BbUNuQixDQUFBO0FBQ0gsQ0FBQyxFQXZHZ0IsV0FBVyxHQUFYLG1CQUFXLEtBQVgsbUJBQVcsUUF1RzNCIn0=