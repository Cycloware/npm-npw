"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("colors");
const Promise = require("bluebird");
const _ = require("lodash");
const chalk = require("chalk");
const fs = require("fs-extra-promise");
const pathMod = require("path");
const path = pathMod;
const commandBuilder_1 = require("./commandBuilder");
const thisPackageInfo = require('../package.json');
const thisPackageName = thisPackageInfo.name;
const thisPackageVersion = thisPackageInfo.version;
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
    let controlFilename = '.cw_module_links';
    let moduleTarget = 'link_modules';
    let rebuild = false;
    const packageFilename = 'package.json';
    const commands = commandBuilder_1.CommandBuilder.Start()
        .command(['--target'], (nArgs) => {
        moduleTarget = nArgs[0];
    }, {
        nArgs: 1,
    })
        .command(['--rebuild'], () => {
        rebuild = true;
    });
    const commandsResult = commands.processCommands(argsIn);
    const { actionsMatched, args: { toPass: argsToPass, toPassLead: argsToPassLead, toPassAdditional: argsToPassAdditional } } = commandsResult;
    const absoluteModuleDir = path.resolve(absoluteBaseDir, moduleTarget);
    const currentDirectory = process.cwd();
    console.log(`moduleTarget: ${moduleTarget.green}`);
    console.log(`absoluteBaseDir: ${absoluteBaseDir.green}`);
    console.log(`absoluteModuleDir: ${absoluteModuleDir.green}`);
    console.log(`currentDirectory: ${currentDirectory.green}`);
    const absolutePackagePath = path.resolve(absoluteBaseDir, packageFilename);
    function getPackageInfo(packagePath) {
        try {
            return { success: true, packageInfo: require(packagePath) };
        }
        catch (err) {
            return { success: false, err, message: `Error loading package.json '${packagePath.gray}'; err: ${chalk.gray(err)}` };
        }
    }
    const packageResult = getPackageInfo(absolutePackagePath);
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
            const absoluteControlFilePath = path.resolve(absoluteModuleDir, controlFilename);
            let currentControlFileOptions;
            try {
                if (fs.existsSync(absoluteControlFilePath)) {
                    currentControlFileOptions = fs.readJsonSync(absoluteControlFilePath);
                }
            }
            catch (err) {
                console.warn(`${'FAILED:  '.red} to open control file '${controlFilename.yellow}' at '${absoluteModuleDir.gray}.  Err: ${chalk.gray(err)}`);
            }
            try {
                const stats = fs.statSync(absoluteModuleDir);
            }
            catch (err) {
                fs.mkdirSync(absoluteModuleDir);
            }
            const mappedPackages = {};
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
                mappedPackages[fullPackageName] = Object.assign({}, sourcePackageInfo, { splitPackageName,
                    packageName,
                    fullPackageName,
                    absolutePackageInstallPath,
                    linkType, relativeSourcePath: {
                        clean: relativeSourcePath,
                        raw: relativeSourcePathRaw,
                    }, absolutePackageDestinationPath: {
                        clean: absolutePackageDestinationPath,
                        raw: absolutePackageDestinationPathRaw,
                    } });
            }
            console.log(`All done, creating [${symlinkPackagesToRemapKeys.length.toString().green}] symlinks`);
            const mappedPackagesKeys = Object.keys(mappedPackages);
            const newContorlOptons = {
                package: thisPackageName,
                version: thisPackageVersion,
                pathLib,
                pathSeperatorBad,
                pathSeperatorGood,
                linkType,
                absoluteBaseDir,
                currentDirectory,
                absoluteModuleDir,
                moduleTarget,
                controlFilename,
                absoluteControlFilePath,
                absolutePackagePath,
                packageFilename,
                rebuild,
                mappedPackagesCount: mappedPackagesKeys.length,
                mappedPackages,
                symlinkPackagesToRemapCount: symlinkPackagesToRemapKeys.length,
                symlinkPackagesToRemap,
                badSymlinkPackagesToRemapCount: badSymlinkPackagesToRemapKeys.length,
                badSymlinkPackagesToRemap,
            };
            fs.writeJSONSync(absoluteControlFilePath, newContorlOptons, { spaces: 2 });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0b3ItbW9kdWxlLWxpbmtlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9leGVjdXRvci1tb2R1bGUtbGlua2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsa0JBQWdCO0FBQ2hCLG9DQUFvQztBQUVwQyw0QkFBNEI7QUFFNUIsK0JBQWdDO0FBSWhDLHVDQUF3QztBQUN4QyxnQ0FBZ0M7QUFFaEMsTUFBTSxJQUFJLEdBQXlCLE9BQU8sQ0FBQztBQUkzQyxxREFBa0Q7QUFFbEQsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDbkQsTUFBTSxlQUFlLEdBQUcsZUFBZSxDQUFDLElBQWMsQ0FBQztBQUN2RCxNQUFNLGtCQUFrQixHQUFHLGVBQWUsQ0FBQyxPQUFpQixDQUFDO0FBRTdELHNCQUE2QixJQUEyRjtJQUV0SCxJQUFJLEVBQUUsV0FBVyxFQUFFLE1BQU0sR0FBRyxFQUFFLEVBQUUsUUFBUSxHQUFHLEVBQUUsRUFBRSxTQUFTLEdBQUcsRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDO0lBQ3ZFLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4QixNQUFNLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakMsQ0FBQztJQUFDLElBQUksQ0FBQyxDQUFDO1FBQ04sRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzFCLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDL0MsQ0FBQztJQUNILENBQUM7SUFFRCxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDOUIsTUFBTSxlQUFlLEdBQUcsSUFB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