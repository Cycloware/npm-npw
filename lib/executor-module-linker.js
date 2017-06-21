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
const getStatInfo_1 = require("./getStatInfo");
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
    let moduleTargetSource = 'default';
    let rebuild = false;
    let allowLinksInPackageInstallPath = false;
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
    const packageFilename = 'package.json';
    const commands = commandBuilder_1.CommandBuilder.Start()
        .command(['--target'], (nArgs) => {
        moduleTarget = nArgs[0];
        moduleTargetSource = 'command';
    }, {
        nArgs: 1,
    })
        .command(['--rebuild'], () => {
        rebuild = true;
    });
    const commandsResult = commands.processCommands(argsIn);
    const { actionsMatched, args: { toPass: argsToPass, toPassLead: argsToPassLead, toPassAdditional: argsToPassAdditional } } = commandsResult;
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
    function buildMessages() {
        return { messages: { info: [], warning: [] } };
    }
    const symlinkPackagesToRemap = {};
    const badSymlinkPackagesToRemap = {};
    const mappedPackages = {};
    const sectionName = 'cw:linkModules';
    const sectionOptionsName = 'cw:LinkModules:options';
    const { packageInfo } = packageResult;
    const packagesToInclude = packageInfo[sectionName];
    if (typeof packagesToInclude !== 'object') {
        const mes = `No section '${sectionName.yellow}' in package.json`;
        console.info(mes);
        return Promise.reject(mes);
    }
    const linkModuleOptions = packageInfo[sectionOptionsName];
    if (linkModuleOptions) {
        if (moduleTargetSource === 'default') {
            const { targetDir } = linkModuleOptions;
            if (typeof targetDir === 'string') {
                moduleTarget = targetDir;
                moduleTargetSource = 'config';
            }
        }
    }
    const absoluteModuleDir = path.resolve(absoluteBaseDir, moduleTarget);
    const currentDirectory = process.cwd();
    console.log(`moduleTarget: ${moduleTarget.green}`);
    console.log(`absoluteBaseDir: ${absoluteBaseDir.green}`);
    console.log(`absoluteModuleDir: ${absoluteModuleDir.green}`);
    console.log(`currentDirectory: ${currentDirectory.green}`);
    // splitPackageName: string[], packageName: string, fullPackageName: string, absolutePackageInstallPath: string,
    //       relativeSourcePath: TPackagePath, absolutePackageDestinationPath: TPackagePath,
    const filePrefix = 'file:';
    for (const fullPackageName in packagesToInclude) {
        const value = packagesToInclude[fullPackageName];
        if (value.startsWith(filePrefix)) {
            const relativePath = value.slice(filePrefix.length);
            pathMod.posix.normalize;
            const absolutePackagePath = path.resolve(absoluteBaseDir, relativePath);
            const splitPackageName = fullPackageName.split('/');
            let packageName = fullPackageName;
            let ensurePackageInstallPathPresent = splitPackageName.length > 1;
            let absolutePackageInstallPath = absoluteModuleDir;
            let packageInstallHardFolderPath = '';
            if (ensurePackageInstallPathPresent) {
                packageInstallHardFolderPath = splitPackageName.slice(0, splitPackageName.length - 1).join('/');
                packageName = splitPackageName[splitPackageName.length - 1];
                absolutePackageInstallPath = path.resolve(absolutePackageInstallPath, packageInstallHardFolderPath);
            }
            const absolutePackageDestinationPathRaw = path.resolve(absolutePackageInstallPath, packageName);
            const absolutePackageDestinationPath = cleanPath(absolutePackageDestinationPathRaw);
            const relativeSourcePathRaw = path.relative(absolutePackageInstallPath, absolutePackagePath);
            const relativeSourcePath = cleanPath(relativeSourcePathRaw);
            symlinkPackagesToRemap[packageName] = {
                fullPackageName,
                rawValue: value,
                strippedValue: relativePath,
                relativePath,
                absolutePath: absolutePackagePath,
                splitPackageName,
                packageName,
                ensurePackageInstallPathPresent,
                packageInstallHardFolderPath,
                absolutePackageInstallPath,
                linkType,
                relativeSourcePath: {
                    clean: relativeSourcePath,
                    raw: relativeSourcePathRaw,
                },
                absolutePackageDestinationPath: {
                    clean: absolutePackageDestinationPath,
                    raw: absolutePackageDestinationPathRaw,
                },
            };
        }
        else {
            badSymlinkPackagesToRemap[fullPackageName] = {
                fullPackageName,
                rawValue: value,
            };
        }
    }
    const badSymlinkPackagesToRemapKeys = Object.keys(badSymlinkPackagesToRemap);
    if (badSymlinkPackagesToRemapKeys.length > 0) {
        console.warn(`${'BAD SymlinkPackagesToRemap'.red} ${`package paths must start with '${filePrefix.green}'`}: ${_.values(badSymlinkPackagesToRemap).map(x => `${x.fullPackageName.gray}: ${x.rawValue.yellow}`).join('; ')}`);
    }
    const symlinkPackagesToRemapKeys = Object.keys(symlinkPackagesToRemap);
    if (symlinkPackagesToRemapKeys.length > 0) {
        console.log(`${'symlinkPackagesToRemap'.blue} [${symlinkPackagesToRemapKeys.length}]: ${_.values(symlinkPackagesToRemap).map(x => `${x.packageName.gray}: ${x.rawValue.yellow}`).join('; ')}`);
    }
    else {
        console.log(`No ${'symlinkPackagesToRemap'.yellow} to map.`);
        return Promise.resolve(0);
    }
    const packagesNeedingInstallPathPresent = _.values(symlinkPackagesToRemap).filter(x => x.ensurePackageInstallPathPresent);
    const groupedPackagesNeedingInstallPath = _.groupBy(packagesNeedingInstallPathPresent, x => x.packageInstallHardFolderPath);
    const ensureInstallPathsPresent = [{ name: 'root module dir', absolutePackageInstallPath: absoluteModuleDir, dependantPackages: symlinkPackagesToRemapKeys }]
        .concat(_.map(groupedPackagesNeedingInstallPath, (val, key) => {
        const fV = val[0];
        const packages = val.map(p => p.fullPackageName);
        return {
            name: `sub-module dir '${key.yellow}'`,
            absolutePackageInstallPath: fV.absolutePackageInstallPath,
            dependantPackages: packages,
        };
    }));
    function ensureInstallPathPresent(install) {
        const core = Object.assign({ install }, buildMessages());
        const { absolutePackageInstallPath, dependantPackages, name } = install;
        return getStatInfo_1.getStatInfo.Async(absolutePackageInstallPath, allowLinksInPackageInstallPath).then(stats => {
            if (stats.result === 'stat-returned') {
                core.messages.info.push(`${'Install path already exists for: '.green} ${name}; DependantPackages: ${dependantPackages.toString().gray}`);
                if (stats.isDirectory) {
                    return Object.assign({ status: 'exists' }, core);
                }
                else {
                    const ret = Object.assign({ status: 'error', errorMessage: `${'Cannot use install path for: '.red} ${name} because it's ${'not a directory'.red}; stats: ${JSON.stringify(stats, null, 1).gray} DependantPackages: ${dependantPackages.toString().gray}` }, core);
                    return ret;
                }
            }
            else if (stats.result === 'not-found') {
                core.messages.info.push(`${'Making install path for: '.green} ${name}; DependantPackages: ${dependantPackages.toString().gray}`);
                return fs.mkdirAsync(absolutePackageInstallPath).then(() => {
                    core.messages.info.push(`${'Made install path for: '.green} ${name}`);
                    return Object.assign({ status: 'create' }, core);
                }).catch(err => {
                    const ret = Object.assign({ status: 'error', errorMessage: `${'Error making install path for: '.red} ${name}; DependantPackages: ${dependantPackages.toString().gray}` }, core);
                    return ret;
                });
            }
            else {
                const ret = Object.assign({ status: 'error', errorMessage: `${'Other error while trying to make install path for: '.red} ${name}; err: ${chalk.gray(stats.errorObject)}; DependantPackages: ${dependantPackages.toString().gray}` }, core);
                return ret;
            }
        });
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
            for (const fullPackageName in symlinkPackagesToRemap) {
            }
            //       function linkModuleAsync(info: TPackageToRemap): Promise<TPackageMapped> {
            //         const { packageName, fullPackageName, absolutePath: sourcePackageAbsolutePath, packageInstallHardFolderPath } = info;
            //         const splitPackageName = fullPackageName.split('/');
            //         let ensurePackageInstallPathPreset = splitPackageName.length > 1;
            //         let absolutePackageInstallPath = absoluteModuleDir;
            //         if (ensurePackageInstallPathPreset) {
            //           const packageInstallHardFolderPath = splitPackageName.slice(0, splitPackageName.length - 1).join('/');
            //           packageName = splitPackageName[splitPackageName.length - 1];
            //           absolutePackageInstallPath = path.resolve(absolutePackageInstallPath, packageInstallHardFolderPath);
            //         }
            //         const absolutePackageDestinationPathRaw = path.resolve(absolutePackageInstallPath, packageName);
            //         const absolutePackageDestinationPath = cleanPath(absolutePackageDestinationPathRaw);
            //         const relativeSourcePathRaw = path.relative(absolutePackageInstallPath, sourcePackageAbsolutePath);
            //         const relativeSourcePath = cleanPath(relativeSourcePathRaw);
            // //         return getStatInfo.Async(absolutePackageInstallPath, allowLinksInPackageInstallPath).then(stats => {
            // //           if (stats.result === 'stat-returned') {
            // //             if (!stats.isDirectory) {
            // // `Cannot link module '${fullPackageName.yellow}' because '${packageInstallHardFolderPath.yellow}' at '${absoluteModuleDir.yellow}' is not a directory.  stats: ${JSON.stringify(stats, null, 1).gray}`
            // //             }
            // //           }
            // //         })
            //         try {
            //           const stats = getStatInfo.Sync(absolutePackageInstallPath, allowLinksInPackageInstallPath);
            //           if (!stats.isDirectory) {
            //             console.error()
            //           }
            //         }
            //         catch (err) {
            //           fs.mkdirSync(absolutePackageInstallPath);
            //         }
            //         // const relativeDestination = path.relative(absolutePackageDestinationPath, absoluteModuleDir);
            //         console.log(`Linking from '${relativeSourcePath.green}' [${relativeSourcePathRaw.gray}] to '${absolutePackageDestinationPath.yellow}'`)
            //         fs.symlinkSync(relativeSourcePath, absolutePackageDestinationPath, linkType);
            //         const ret: TPackageMapped = {
            //           status: 'mapped',
            //           ...info,
            //           splitPackageName,
            //           packageName,
            //           fullPackageName,
            //           absolutePackageInstallPath,
            //           linkType,
            //           relativeSourcePath: {
            //             clean: relativeSourcePath,
            //             raw: relativeSourcePathRaw,
            //           },
            //           absolutePackageDestinationPath: {
            //             clean: absolutePackageDestinationPath,
            //             raw: absolutePackageDestinationPathRaw,
            //           },
            //         }
            //       }
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
                    const stats = getStatInfo_1.getStatInfo.Sync(absolutePackageInstallPath, allowLinksInPackageInstallPath);
                    if (stats.result === 'stat-returned') {
                        if (!stats.isDirectory) {
                            const msg = `Cannot link module '${fullPackageName.yellow}' because '${packageInstallHardFolderPath.yellow}' at '${absoluteModuleDir.yellow}' is not a directory.  stats: ${JSON.stringify(stats, null, 1).gray}`;
                            console.error(msg);
                            return Promise.reject(msg);
                        }
                    }
                    else if (stats.result === 'not-found') {
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
                // mappedPackages[fullPackageName] = {
                //   status: 'mapped',
                //   ...sourcePackageInfo,
                //   splitPackageName,
                //   packageName,
                //   fullPackageName,
                //   absolutePackageInstallPath,
                //   linkType,
                //   relativeSourcePath: {
                //     clean: relativeSourcePath,
                //     raw: relativeSourcePathRaw,
                //   },
                //   absolutePackageDestinationPath: {
                //     clean: absolutePackageDestinationPath,
                //     raw: absolutePackageDestinationPathRaw,
                //   },
                // }
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
                sectionName,
                sectionInfo: packagesToInclude,
                sectionOptionsName,
                sectionOptions: linkModuleOptions,
                allowLinksInPackageInstallPath,
                absoluteModuleDir,
                moduleTarget,
                moduleTargetSource,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0b3ItbW9kdWxlLWxpbmtlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9leGVjdXRvci1tb2R1bGUtbGlua2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsa0JBQWdCO0FBQ2hCLG9DQUFvQztBQUVwQyw0QkFBNEI7QUFFNUIsK0JBQWdDO0FBSWhDLHVDQUF3QztBQUN4QyxnQ0FBZ0M7QUFFaEMsTUFBTSxJQUFJLEdBQXlCLE9BQU8sQ0FBQztBQUkzQyxxREFBa0Q7QUFFbEQsK0NBQTRDO0FBRTVDLE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBQ25ELE1BQU0sZUFBZSxHQUFHLGVBQWUsQ0FBQyxJQUFjLENBQUM7QUFDdkQsTUFBTSxrQkFBa0IsR0FBRyxlQUFlLENBQUMsT0FBaUIsQ0FBQztBQUU3RCxzQkFBNkIsSUFBMkY7SUFFdEgsSUFBSSxFQUFFLFdBQVcsRUFBRSxNQUFNLEdBQUcsRUFBRSxFQUFFLFFBQVEsR0FBRyxFQUFFLEVBQUUsU0FBUyxHQUFHLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQztJQUN2RSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsTUFBTSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFBQyxJQUFJLENBQUMsQ0FBQztRQUNOLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMxQixNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQy9DLENBQUM7SUFDSCxDQUFDO0lBRUQsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQzlCLE1BQU0s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