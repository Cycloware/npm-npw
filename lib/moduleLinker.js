"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("colors");
const Promise = require("bluebird");
const _ = require("lodash");
const chalk = require("chalk");
const fs = require("fs-extra-promise");
const pathMod = require("path");
const path = pathMod;
function moduleLinker(exec) {
    let { commandText, argsIn = [], argsAsIs = [], argsToNpm = [] } = exec;
    if (argsIn.length === 0) {
        argsIn = process.argv.slice(2);
    }
    else {
        if (argsAsIs.length === 0) {
            argsIn = argsIn.concat(process.argv.slice(2));
        }
    }
    const baseDir = process.cwd();
    const absoluteBaseDir = path.resolve(baseDir);
    const absoluteModuleDir = path.resolve(absoluteBaseDir, 'link_modules');
    const currentDirectory = process.cwd();
    console.log(`absoluteBaseDir: ${absoluteBaseDir.green}`);
    console.log(`absoluteModuleDir: ${absoluteModuleDir.green}`);
    console.log(`currentDirectory: ${currentDirectory.green}`);
    const packagePath = path.resolve('package.json');
    function getPackageInfo(packagePath) {
        try {
            return { success: true, packageInfo: require(packagePath) };
        }
        catch (err) {
            return { success: false, err, message: `Error loading package.json '${packagePath.gray}'; err: ${chalk.gray(err)}` };
        }
    }
    const packageResult = getPackageInfo(packagePath);
    if (packageResult.success === false) {
        console.error(packageResult.message);
        return Promise.reject(packageResult.message);
    }
    const symlinkPackagesToRemap = {};
    const badSymlinkPackagesToRemap = {};
    const sectionName = 'cw:linkModules';
    const { packageInfo } = packageResult;
    const packagesToInclude = packageInfo[sectionName];
    if (typeof packagesToInclude !== 'object') {
        const mes = `No section '${sectionName.yellow}' in package.json`;
        console.info(mes);
        return Promise.reject(mes);
    }
    const filePrefix = 'file:';
    for (const packageName in packagesToInclude) {
        const value = packagesToInclude[packageName];
        if (value.startsWith(filePrefix)) {
            const relativePath = value.slice(filePrefix.length);
            pathMod.posix.normalize;
            const absolutePackagePath = path.resolve(absoluteBaseDir, relativePath);
            symlinkPackagesToRemap[packageName] = {
                packageName,
                rawValue: value,
                strippedValue: relativePath,
                relativePath,
                absolutePath: absolutePackagePath,
            };
        }
        else {
            badSymlinkPackagesToRemap[packageName] = {
                packageName,
                rawValue: value,
            };
        }
    }
    const badSymlinkPackagesToRemapKeys = Object.keys(badSymlinkPackagesToRemap);
    if (badSymlinkPackagesToRemapKeys.length > 0) {
        console.warn(`${'BAD SymlinkPackagesToRemap'.red} ${`package paths must start with '${filePrefix.green}'`}: ${_.values(badSymlinkPackagesToRemap).map(x => `${x.packageName.gray}: ${x.rawValue.yellow}`).join('; ')}`);
    }
    const symlinkPackagesToRemapKeys = Object.keys(symlinkPackagesToRemap);
    if (symlinkPackagesToRemapKeys.length > 0) {
        console.log(`${'symlinkPackagesToRemap'.blue} [${symlinkPackagesToRemapKeys.length}]: ${_.values(symlinkPackagesToRemap).map(x => `${x.packageName.gray}: ${x.rawValue.yellow}`).join('; ')}`);
    }
    else {
        console.log(`No ${'symlinkPackagesToRemap'.yellow} to map.`);
        return Promise.resolve(0);
    }
    return fs.existsAsync(absoluteModuleDir).then(doesExist => {
        if (doesExist) {
            return null;
        }
        else {
            console.log(`Creating absoluteModuleDir: ${absoluteModuleDir.yellow}`);
            return fs.mkdirAsync(absoluteModuleDir).tapCatch(err => console.error(`Failed to mkdir '${absoluteBaseDir.red}'. Err: ${chalk.gray(err)}`));
        }
    }).then(res => {
        let pathLib = 'unknown';
        let pathI = path;
        let pathSeperatorBad = '\\';
        let pathSeperatorGood = '/';
        let linkType = 'dir';
        if (pathMod.win32 === path) {
            pathLib = 'WIN32';
            pathI = pathMod.win32;
            const t = pathSeperatorBad;
            pathSeperatorBad = pathSeperatorGood;
            pathSeperatorGood = t;
            console.log(`${pathLib.yellow} file paths`);
        }
        else if (pathMod.posix === path) {
            pathLib = 'POSIX';
            pathI = pathMod.posix;
            console.log(`${pathLib.yellow} file paths`);
        }
        else {
            console.log(`${pathLib.red} file paths`);
        }
        function cleanPath(pathIn) {
            return pathIn.split(pathSeperatorBad).join(pathSeperatorGood);
        }
        const workingDirChanged = absoluteModuleDir.toLowerCase() !== currentDirectory.toLowerCase();
        try {
            if (workingDirChanged) {
                const newWorkingDir = path.relative(currentDirectory, absoluteModuleDir);
                console.log(`Changed working directory to absoluteModuleDir: ${newWorkingDir.green} [${absoluteModuleDir.gray}]`);
                process.chdir(newWorkingDir);
            }
            try {
                const stats = fs.statSync(absoluteModuleDir);
            }
            catch (err) {
                fs.mkdirSync(absoluteModuleDir);
            }
            for (const fullPackageName in symlinkPackagesToRemap) {
                const splitPackageName = fullPackageName.split('/');
                let packageName = fullPackageName;
                const sourcePackageInfo = symlinkPackagesToRemap[fullPackageName];
                const { absolutePath: sourcePackageAbsolutePath } = sourcePackageInfo;
                let absolutePackageInstallPath = absoluteModuleDir;
                if (splitPackageName.length > 1) {
                    const packageInstallHardFolderPath = splitPackageName.slice(0, splitPackageName.length - 1).join('/');
                    packageName = splitPackageName[splitPackageName.length - 1];
                    absolutePackageInstallPath = path.resolve(absolutePackageInstallPath, packageInstallHardFolderPath);
                    try {
                        const stats = fs.statSync(absolutePackageInstallPath);
                    }
                    catch (err) {
                        fs.mkdirSync(absolutePackageInstallPath);
                    }
                }
                const absolutePackageDestinationPathRaw = path.resolve(absolutePackageInstallPath, packageName);
                const absolutePackageDestinationPath = cleanPath(absolutePackageDestinationPathRaw);
                const relativeSourcePathRaw = path.relative(absolutePackageInstallPath, sourcePackageAbsolutePath);
                const relativeSourcePath = cleanPath(relativeSourcePathRaw);
                // const relativeDestination = path.relative(absolutePackageDestinationPath, absoluteModuleDir);
                console.log(`Linking from '${relativeSourcePath.green}' [${relativeSourcePathRaw.gray}] to '${absolutePackageDestinationPath.yellow}'`);
                fs.symlinkSync(relativeSourcePath, absolutePackageDestinationPath, linkType);
            }
            console.log(`All done, creating [${symlinkPackagesToRemapKeys.length.toString().green}] symlinks`);
            if (workingDirChanged) {
                const newWorkingDir = path.relative(absoluteModuleDir, currentDirectory);
                console.log(`Changing working directory back to: ${newWorkingDir.green} [${currentDirectory.gray}]`);
                process.chdir(newWorkingDir);
            }
            return symlinkPackagesToRemap;
        }
        catch (err) {
            console.error(`${'Error occurred'.red}:  ${err}`);
            throw err;
        }
    });
}
exports.moduleLinker = moduleLinker;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kdWxlTGlua2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL21vZHVsZUxpbmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLGtCQUFnQjtBQUNoQixvQ0FBb0M7QUFFcEMsNEJBQTRCO0FBRTVCLCtCQUFnQztBQUloQyx1Q0FBd0M7QUFDeEMsZ0NBQWdDO0FBRWhDLE1BQU0sSUFBSSxHQUF5QixPQUFPLENBQUM7QUFNM0Msc0JBQTZCLElBQTJGO0lBRXRILElBQUksRUFBRSxXQUFXLEVBQUUsTUFBTSxHQUFHLEVBQUUsRUFBRSxRQUFRLEdBQUcsRUFBRSxFQUFFLFNBQVMsR0FBRyxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUM7SUFDdkUsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLE1BQU0sR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNqQyxDQUFDO0lBQUMsSUFBSSxDQUFDLENBQUM7UUFDTixFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDMUIsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMvQyxDQUFDO0lBQ0gsQ0FBQztJQUVELE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUM5QixNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRTlDLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDeEUsTUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7SUFFdkMsT0FBTyxDQUFDLEdB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