"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
require("colors");
// import * as Promise from 'bluebird';
const _ = require("lodash");
const ch = require("chalk");
const fs = require("fs-extra-promise");
const pathMod = require("path");
const del = require("del");
const path = pathMod;
const commandBuilder_1 = require("./commandBuilder");
const changeDirectory_1 = require("./changeDirectory");
const getStatInfo_1 = require("./getStatInfo");
const logger_1 = require("./logger");
const stringComparer_1 = require("./stringComparer");
const thisPackage_1 = require("./thisPackage");
function moduleLinker(exec) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        let { commandText, argsIn = [], argsAsIs = [], argsToNpm = [] } = exec;
        if (argsIn.length === 0) {
            argsIn = process.argv.slice(2);
        }
        else {
            if (argsAsIs.length === 0) {
                argsIn = argsIn.concat(process.argv.slice(2));
            }
        }
        {
            const titleLine = `${'Cycloware'.blue} ${'Module Linker'.green.bold.italic}`;
            const titleLineLength = ch.stripColor(titleLine).length;
            logger_1.GlobalLogger.info(`${titleLine}    
${'-'.repeat(titleLineLength).green}
`);
        }
        const baseDir = process.cwd();
        const absoluteBaseDir = path.resolve(baseDir);
        let controlFilename = '.cw_module_links';
        let moduleTarget = 'link_modules';
        let moduleTargetSource = 'default';
        let rebuild = false;
        let allowLinksInPackageInstallPath = false;
        let caseSensitive = false;
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
        })
            .command(['--quiet'], () => {
            logger_1.changeGlobalLogger(['warn', 'error']);
        })
            .command(['--verbose'], () => {
            logger_1.changeGlobalLogger(['trace', 'info', 'warn', 'error']);
        })
            .command(['--ignore-case'], () => {
            caseSensitive = false;
        });
        const commandsResult = commands.processCommands(argsIn);
        const { actionsMatched, args: { toPass: argsToPass, toPassLead: argsToPassLead, toPassAdditional: argsToPassAdditional } } = commandsResult;
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
            logger_1.GlobalLogger.trace(` + File paths: ${pathLib.blue}`);
        }
        else if (pathMod.posix === path) {
            pathLib = 'POSIX';
            pathI = pathMod.posix;
            logger_1.GlobalLogger.trace(` + File paths: ${pathLib.blue}`);
        }
        else {
            logger_1.GlobalLogger.trace(` + File paths: ${pathLib.red}`);
        }
        function cleanPath(pathIn) {
            return pathIn.split(pathSeperatorBad).join(pathSeperatorGood);
        }
        function cleanPathObj(pathIn) {
            return {
                raw: pathIn,
                clean: cleanPath(pathIn),
            };
        }
        const compareStrings = stringComparer_1.stringComparer.get(caseSensitive);
        logger_1.GlobalLogger.trace(` + Case-Sensitive Paths: ${caseSensitive ? 'true'.red : 'false'.blue}`);
        const absolutePackagePath = path.resolve(absoluteBaseDir, packageFilename);
        function getPackageInfo(packagePath) {
            return tslib_1.__awaiter(this, void 0, void 0, function* () {
                try {
                    return { success: true, packageInfo: yield fs.readJSONAsync(packagePath) };
                }
                catch (err) {
                    return { success: false, err, message: `Error loading package.json '${packagePath.gray}'; err: ${ch.gray(err)}` };
                }
            });
        }
        const packageResult = yield getPackageInfo(absolutePackagePath);
        if (packageResult.success === false) {
            logger_1.GlobalLogger.error(packageResult.message);
            throw new Error(packageResult.message.strip);
            // return Promise.reject(packageResult.message);
        }
        const symlinkPackagesToRemap = {};
        const badSymlinkPackagesToRemap = {};
        const mappedPackages = {};
        const sectionName = 'cw:linkModules';
        const sectionOptionsName = 'cw:linkModules:options';
        const { packageInfo } = packageResult;
        const packagesToInclude = packageInfo[sectionName];
        if (typeof packagesToInclude !== 'object') {
            const mes = `No section '${sectionName.yellow}' in package.json`;
            logger_1.GlobalLogger.error(mes);
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
                else if (targetDir) {
                    const msg = ch.gray(`${'Unknown type'.red} for property ${'targetDir'.white} in ${sectionOptionsName.white}, expected a ${'string'.green}, but got typeof '${(typeof targetDir).red}' [${ch.white(targetDir)}]`);
                    console.error(msg);
                    // return Promise.reject(msg.strip);
                    throw new Error(msg.strip);
                }
            }
        }
        const absoluteModuleDir = path.resolve(absoluteBaseDir, moduleTarget);
        const relativeModuleDir = path.relative(absoluteBaseDir, absoluteModuleDir);
        const currentDirectory = process.cwd();
        logger_1.GlobalLogger.trace(` + moduleTarget: ${moduleTarget.blue}`);
        logger_1.GlobalLogger.trace(` + absoluteBaseDir: ${absoluteBaseDir.blue}`);
        logger_1.GlobalLogger.trace(` + absoluteModuleDir: ${absoluteModuleDir.blue}`);
        logger_1.GlobalLogger.trace(` + currentDirectory: ${currentDirectory.blue}`);
        // splitPackageName: string[], packageName: string, fullPackageName: string, absolutePackageInstallPath: string,
        //       relativeSourcePath: TPackagePath, absolutePackageDestinationPath: TPackagePath,
        const filePrefix = 'file:';
        for (const fullPackageName in packagesToInclude) {
            const value = packagesToInclude[fullPackageName];
            if (value.startsWith(filePrefix)) {
                const relativeSourcePath = cleanPathObj(value.slice(filePrefix.length));
                const absoluteSourcePath = cleanPathObj(path.resolve(absoluteBaseDir, relativeSourcePath.raw));
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
                const relativePackageInstallPath = path.relative(absoluteBaseDir, absolutePackageInstallPath);
                const packageDestinationInModules = cleanPathObj(path.join(moduleTarget, fullPackageName));
                const absolutePackageDestinationPath = cleanPathObj(path.resolve(absolutePackageInstallPath, packageName));
                const relativeLinkToSourcePath = cleanPathObj(path.relative(absolutePackageInstallPath, absoluteSourcePath.raw));
                symlinkPackagesToRemap[packageName] = {
                    fullPackageName,
                    packageName,
                    packageDestinationInModules,
                    rawValue: value,
                    relativeSourcePath,
                    absoluteSourcePath,
                    splitPackageName,
                    ensurePackageInstallPathPresent,
                    packageInstallHardFolderPath,
                    absolutePackageInstallPath,
                    relativePackageInstallPath,
                    linkType,
                    relativeLinkToSourcePath,
                    absoluteLinkToSourcePath: absoluteSourcePath,
                    absolutePackageDestinationPath,
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
            logger_1.GlobalLogger.warn(` + ${'BAD SymlinkPackagesToRemap'.red} ${`package paths must start with '${filePrefix.green}'`}: ${_.values(badSymlinkPackagesToRemap).map(x => `${x.fullPackageName.gray}: ${x.rawValue.yellow}`).join('; ')}`);
        }
        const symlinkPackagesToRemapKeys = Object.keys(symlinkPackagesToRemap);
        if (symlinkPackagesToRemapKeys.length > 0) {
            logger_1.GlobalLogger.trace(ch.gray(`${' + symlinkPackagesToRemap'.white} [${ch.white(symlinkPackagesToRemapKeys.length)}]: ${_.values(symlinkPackagesToRemap).map(x => `${x.fullPackageName.yellow} [${x.rawValue.white}]`).join(', ')}`));
        }
        else {
            logger_1.GlobalLogger.warn(` + No ${'symlinkPackagesToRemap'.yellow} to map.`);
            return 0;
        }
        const packagesNeedingInstallPathPresent = _.values(symlinkPackagesToRemap).filter(x => x.ensurePackageInstallPathPresent);
        const groupedPackagesNeedingInstallPath = _.groupBy(packagesNeedingInstallPathPresent, x => x.packageInstallHardFolderPath);
        const moduleDirInstallInfo = { name: moduleTarget, type: 'Link Module Directory', absolutePackageInstallPath: absoluteModuleDir, relativePackageInstallPath: relativeModuleDir, dependantPackages: symlinkPackagesToRemapKeys };
        const ensureInstallPathsPresent = _.map(groupedPackagesNeedingInstallPath, (val, key) => {
            const fV = val[0];
            const packages = val.map(p => p.fullPackageName);
            return {
                name: key.yellow,
                type: 'Sub Module Directory',
                absolutePackageInstallPath: fV.absolutePackageInstallPath,
                relativePackageInstallPath: fV.relativePackageInstallPath,
                dependantPackages: packages,
            };
        });
        function ensureInstallPathPresent(install) {
            return tslib_1.__awaiter(this, void 0, void 0, function* () {
                const messages = logger_1.buildMessagesCore();
                const core = { install, messages, };
                try {
                    const { absolutePackageInstallPath, relativePackageInstallPath, dependantPackages, name, type } = install;
                    messages.info(ch.gray(`${'Ensure Exists'.white}: ${relativePackageInstallPath.yellow} [${type}]`));
                    messages.trace(ch.gray(` -- absolutePackageInstallPath: [${absolutePackageInstallPath.gray}] allowLinksInPackageInstallPath: [${allowLinksInPackageInstallPath ? 'true'.red : 'false'.yellow}] DependantPackages: ${dependantPackages}`));
                    const stats = yield getStatInfo_1.getStatInfo.Async(absolutePackageInstallPath, allowLinksInPackageInstallPath);
                    if (stats.result === 'stat-returned') {
                        messages.trace(ch.gray(` -- ${'already exists'.green}: ${relativePackageInstallPath.yellow}`));
                        if (stats.isDirectory) {
                            const ret = Object.assign({ status: 'exists' }, core);
                            return ret;
                        }
                        else {
                            const ret = Object.assign({ status: 'error', errorMessage: ch.gray(` -- ${`cannot use install path ${relativePackageInstallPath.yellow} because it is NOT a directory`}; stats: ${JSON.stringify(stats, null, 1).gray}; absolutePackageInstallPath: ${absolutePackageInstallPath.white}  DependantPackages: ${dependantPackages.toString().gray}`) }, core);
                            return ret;
                        }
                    }
                    else if (stats.result === 'not-found') {
                        yield fs.mkdirAsync(absolutePackageInstallPath);
                        messages.trace(ch.gray(` -- ${'creating directory'.blue}: ${relativePackageInstallPath.yellow}`));
                        try {
                            messages.trace(ch.gray(` -- ${'created directory'.green}: ${relativePackageInstallPath.yellow}`));
                            return Object.assign({ status: 'create' }, core);
                        }
                        catch (err) {
                            const ret = Object.assign({ status: 'error', errorMessage: ch.gray(` -- ${'error creating directory'.red}: ${relativePackageInstallPath.yellow}; err: ${ch.gray(err)}; DependantPackages: ${dependantPackages.toString().gray}`) }, core);
                            return ret;
                        }
                    }
                    else {
                        const ret = Object.assign({ status: 'error', errorMessage: ` -- ${'Other error while trying to make install path for: '.red} ${name.yellow}; err: ${ch.gray(stats.errorObject)}; DependantPackages: ${dependantPackages.toString().gray}` }, core);
                        return ret;
                    }
                }
                catch (err) {
                    const ret = Object.assign({ status: 'error', errorMessage: ` -- ${'Unhandled error while trying to make install path for: '.red} ${install ? install.name : 'Unknown'}; err: ${ch.gray(err)}` }, core);
                    return ret;
                }
            });
        }
        function printMessages(input) {
            if (input) {
                const { messages, errorMessage } = input;
                if (messages) {
                    const { items } = messages;
                    if (items && items.length > 0) {
                        for (const item of items) {
                            logger_1.GlobalLogger[item.type](item.msg);
                        }
                    }
                }
                if (errorMessage) {
                    logger_1.GlobalLogger.error(errorMessage);
                }
            }
        }
        const res = yield ensureInstallPathPresent(moduleDirInstallInfo);
        printMessages(res);
        if (res.status === 'error') {
            throw new Error(ch.stripColor(res.errorMessage));
        }
        if (ensureInstallPathsPresent.length > 0) {
            const res = yield Promise.all(ensureInstallPathsPresent.map(x => ensureInstallPathPresent(x)));
            res.forEach(p => printMessages(p));
            const errorInstallPaths = res.filter(p => p.status === 'error');
            if (errorInstallPaths.length > 0) {
                throw new Error(ch.stripColor(`Package Install Paths failed for:
  ${errorInstallPaths.map(p => p.errorMessage).join('  \n')}`));
            }
        }
        logger_1.GlobalLogger.info('');
        return yield changeDirectory_1.ChangeDirectory.Async({
            absoluteNewCurrentDirectory: absoluteModuleDir
        }, (state) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                const absoluteControlFilePath = path.resolve(absoluteModuleDir, controlFilename);
                let currentControlFileOptions;
                try {
                    currentControlFileOptions = yield fs.readJsonAsync(absoluteControlFilePath);
                }
                catch (err) {
                    if (err.code !== 'ENOENT') {
                        logger_1.GlobalLogger.warn(` + ${'FAILED:  '.red} to open control file '${controlFilename.yellow}' at '${absoluteModuleDir.gray}.  Err: ${ch.gray(err)}`);
                    }
                }
                function linkModuleAsync(info) {
                    return tslib_1.__awaiter(this, void 0, void 0, function* () {
                        const { packageName, fullPackageName, absoluteLinkToSourcePath, relativeLinkToSourcePath, packageInstallHardFolderPath, absolutePackageInstallPath, absoluteSourcePath, absolutePackageDestinationPath, relativeSourcePath } = info;
                        const messages = logger_1.buildMessagesCore();
                        const core = Object.assign({}, info, { messages });
                        messages.info(ch.white(`${'Symlink'.white}:  ${fullPackageName.yellow} -> ${relativeSourcePath.clean.gray}`));
                        // messages.trace(ch.gray(` -- absolutePackageInstallPath: [${absolutePackageInstallPath.gray}] allowLinksInPackageInstallPath: [${allowLinksInPackageInstallPath ? 'true'.red : 'false'.yellow}] DependantPackages: ${dependantPackages}`))
                        try {
                            const stats = yield getStatInfo_1.getStatInfo.Async(absolutePackageDestinationPath.clean, true);
                            function createSymLink(operationStatus, operationDescription) {
                                return tslib_1.__awaiter(this, void 0, void 0, function* () {
                                    messages.info(ch.gray(` -- ${'linking'.green} ${fullPackageName.yellow} with '${operationDescription}' as '${linkType.blue}' from '${relativeSourcePath.clean.green}' [${absoluteSourcePath.clean.gray}] to '${path.resolve(moduleTarget, fullPackageName).green}' [${absolutePackageDestinationPath.clean.gray}]`));
                                    try {
                                        yield fs.symlinkAsync(relativeLinkToSourcePath.clean, absolutePackageDestinationPath.clean, linkType);
                                        messages.info(ch.gray(` -- ${'LINKED'.green}'`));
                                        const ret = Object.assign({ status: operationStatus }, core);
                                        return ret;
                                    }
                                    catch (err) {
                                        const ret = Object.assign({ status: 'error', statusSub: 'creating-symlink', errorMessage: `${' -- Error creating symlink: '.red} with '${operationDescription}' as '${linkType.blue}' from '${relativeSourcePath.clean.green} [${absoluteSourcePath.clean.gray}]; Err: ${ch.gray(err)}` }, core);
                                        return ret;
                                    }
                                });
                            }
                            if (stats.result === 'stat-returned') {
                                if (stats.isSymbolicLink) {
                                    messages.trace(ch.gray(` -- install path ${'already a symlink'.blue}:  ${'will check target'.yellow}: expectedTarget: [${relativeLinkToSourcePath.clean.white}]`));
                                    try {
                                        const res = yield fs.readlinkAsync(absolutePackageDestinationPath.clean);
                                        const existingLinkTarget = cleanPathObj(res);
                                        const existingAbsoluteLinkTarget = cleanPathObj(path.resolve(absolutePackageInstallPath, existingLinkTarget.clean));
                                        const existingMatch = compareStrings(existingLinkTarget.clean, relativeLinkToSourcePath.clean);
                                        let existingDiffersByCase = undefined;
                                        if (!existingMatch && caseSensitive) {
                                            existingDiffersByCase = stringComparer_1.stringComparer.Insensitive(existingLinkTarget.clean, relativeLinkToSourcePath.clean);
                                        }
                                        core.existing = {
                                            linkTarget: existingLinkTarget,
                                            absoluteLinkTarget: existingAbsoluteLinkTarget,
                                            caseSensitive,
                                            existingMatch,
                                            existingDiffersByCase,
                                        };
                                        if (existingMatch) {
                                            messages.trace(ch.gray(` -- install target ${'MATCHES'.green}`));
                                            const ret = Object.assign({ status: 'exists' }, core);
                                            return ret;
                                        }
                                        else {
                                            if (existingDiffersByCase) {
                                                messages.warn(ch.gray(` -- install target ${'only differs by CASE'.red} (to ignore case use ${'--ignore-case'.blue})  existingLinkTarget: ${existingLinkTarget.clean.yellow}; relativeLinkToSourcePath: ${relativeLinkToSourcePath.clean.yellow}`));
                                            }
                                            messages.trace(ch.gray(` -- install target ${'does NOT match'.yellow}, will rebuild symlink.  existingTarget: ${existingLinkTarget.clean.white}, expectedTarget: ${relativeLinkToSourcePath.clean.white}`));
                                            try {
                                                const resDel = yield del(absolutePackageDestinationPath.clean);
                                                return yield createSymLink('mapped-recreate', 'recreate'.red);
                                            }
                                            catch (err) {
                                                const ret = Object.assign({ status: 'error', statusSub: 'remove-existing-symlink', errorMessage: ` -- ${'Error removing existing symlink for: '.red} ${fullPackageName.yellow} [${absolutePackageDestinationPath.clean.gray}]; Err: ${ch.gray(err)}` }, core);
                                                return ret;
                                            }
                                        }
                                    }
                                    catch (err) {
                                        const ret = Object.assign({ status: 'error', statusSub: 'read-existing-symlink', errorMessage: ` -- ${'Error readlinkAsync for: '.red} ${fullPackageName.yellow} [${absolutePackageDestinationPath.clean.gray}]; Err: ${ch.gray(err)}` }, core);
                                        return ret;
                                    }
                                }
                                else {
                                    const ret = Object.assign({ status: 'error', statusSub: 'exist-not-symlink', errorMessage: ` -- ${'Target location exists but is not a symlink: '.red} ${fullPackageName.yellow}; Location [${absolutePackageDestinationPath.clean.gray}]; Stat: [${JSON.stringify(stats, null, 1).gray}]` }, core);
                                    return ret;
                                }
                            }
                            else if (stats.result === 'not-found') {
                                return yield createSymLink('mapped-recreate', 'recreate'.red);
                            }
                            else {
                                const ret = Object.assign({ status: 'error', statusSub: 'other', errorMessage: ` -- ${'Other error from getStatInfo: '.red} ${fullPackageName.yellow}; Location [${absolutePackageDestinationPath.clean.gray}]; Err: [${ch.gray(stats.errorObject)}]` }, core);
                                return ret;
                            }
                        }
                        catch (err) {
                            const ret = Object.assign({ status: 'error', statusSub: 'get-stat-info', errorMessage: ` -- ${'Error getStatInfo for: '.red} ${fullPackageName.yellow} [${absolutePackageDestinationPath.clean.gray}]; Err: ${ch.gray(err)}` }, core);
                            return ret;
                        }
                    });
                }
                const res = yield Promise.all(_.values(symlinkPackagesToRemap).map(val => linkModuleAsync(val)));
                res.forEach(p => printMessages(p));
                logger_1.GlobalLogger.info('');
                logger_1.GlobalLogger.warn(`Installed ${ch.green(symlinkPackagesToRemapKeys.length)} symlinks`);
                const mappedPackagesKeys = Object.keys(mappedPackages);
                const newControlFileOptions = Object.assign({}, thisPackage_1.ThisPackage, { caseSensitive,
                    pathLib,
                    pathSeperatorBad,
                    pathSeperatorGood,
                    linkType,
                    absoluteBaseDir,
                    currentDirectory,
                    sectionName, sectionInfo: packagesToInclude, sectionOptionsName, sectionOptions: linkModuleOptions, allowLinksInPackageInstallPath,
                    absoluteModuleDir,
                    relativeModuleDir,
                    moduleTarget,
                    moduleTargetSource,
                    controlFilename,
                    absoluteControlFilePath,
                    absolutePackagePath,
                    packageFilename,
                    rebuild, mappedPackagesCount: mappedPackagesKeys.length, mappedPackages, symlinkPackagesToRemapCount: symlinkPackagesToRemapKeys.length, symlinkPackagesToRemap, badSymlinkPackagesToRemapCount: badSymlinkPackagesToRemapKeys.length, badSymlinkPackagesToRemap });
                fs.writeJSONSync(absoluteControlFilePath, newControlFileOptions, { spaces: 2 });
                const errros = res.filter(p => p.status === 'error');
                if (errros.length > 0) {
                    const msg = (`${'***'.yellow} linkModules failed for [${errros.length.toString().red}]:
        ${errros.map(p => p.errorMessage).join('  \n')}`);
                    logger_1.GlobalLogger.error(msg);
                }
                return newControlFileOptions;
            }
            catch (err) {
                logger_1.GlobalLogger.error(`${'Unhandled Error occurred'.red}:  ${err}`);
                throw err;
            }
        }));
    });
}
exports.moduleLinker = moduleLinker;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0b3ItbW9kdWxlLWxpbmtlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9leGVjdXRvci1tb2R1bGUtbGlua2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLGtCQUFnQjtBQUNoQix1Q0FBdUM7QUFFdkMsNEJBQTRCO0FBRTVCLDRCQUE2QjtBQUk3Qix1Q0FBd0M7QUFDeEMsZ0NBQWdDO0FBQ2hDLDJCQUE0QjtBQUU1QixNQUFNLElBQUksR0FBeUIsT0FBTyxDQUFDO0FBSTNDLHFEQUFrRDtBQUNsRCx1REFBb0Q7QUFFcEQsK0NBQTRDO0FBRTVDLHFDQUEwRztBQUUxRyxxREFBa0Q7QUFHbEQsK0NBQTRDO0FBc0M1QyxzQkFBbUMsSUFBMkY7O1FBRTVILElBQUksRUFBRSxXQUFXLEVBQUUsTUFBTSxHQUFHLEVBQUUsRUFBRSxRQUFRLEdBQUcsRUFBRSxFQUFFLFNBQVMsR0FBRyxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFDdkUsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hCLE1BQU0sR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqQyxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDTixFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDL0MsQ0FBQztRQUNILENBQUM7UUFDRCxDQUFDO1lBQ0MsTUFBTSxTQUFTLEdBQUcsR0FBRyxXQUFXLENBQUMsSUFBSSxJQUFJLGVBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzdFLE1BQU0sZUFBZSxHQUFH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