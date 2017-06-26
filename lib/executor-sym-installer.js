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
        let validateSourcesExist = true;
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
        const packagesToLink = [];
        const packagesThatCantLink = [];
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
                packagesToLink.push({
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
                });
            }
            else {
                packagesThatCantLink.push({
                    fullPackageName,
                    rawValue: value,
                });
            }
        }
        if (packagesThatCantLink.length > 0) {
            logger_1.GlobalLogger.warn(` + ${'BAD packagesThatCantLink'.red} ${`package paths must start with '${filePrefix.green}'`}: ${packagesThatCantLink.map(x => `${x.fullPackageName.gray}: ${x.rawValue.yellow}`).join('; ')}`);
        }
        if (packagesToLink.length > 0) {
            logger_1.GlobalLogger.trace(ch.gray(`${' + packagesToLink'.white} [${ch.white(packagesToLink.length)}]: ${packagesToLink.map(x => `${x.fullPackageName.yellow} [${x.rawValue.white}]`).join(', ')}`));
        }
        else {
            logger_1.GlobalLogger.warn(` + No ${'packagesToLink'.yellow} to map.`);
            return 0;
        }
        const packagesToLinkKeys = packagesToLink.map(x => x.fullPackageName);
        const moduleDirInstallInfo = { name: moduleTarget, type: 'Link Module Directory', absolutePackageInstallPath: absoluteModuleDir, relativePackageInstallPath: relativeModuleDir, dependantPackages: packagesToLinkKeys };
        const groupedPackagesNeedingInstallPath = _.groupBy(packagesToLink.filter(x => x.ensurePackageInstallPathPresent), x => x.packageInstallHardFolderPath);
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
                let currentControlRawData;
                try {
                    currentControlRawData = yield fs.readJsonAsync(absoluteControlFilePath);
                }
                catch (err) {
                    if (err.code !== 'ENOENT') {
                        logger_1.GlobalLogger.warn(` + ${'FAILED:  '.red} to open control file '${controlFilename.yellow}' at '${absoluteModuleDir.gray}.  Err: ${ch.gray(err)}`);
                    }
                }
                function parseControlFileOptions() {
                    try {
                        const { when, name, version } = currentControlRawData;
                        if (name !== thisPackage_1.ThisPackage.name) {
                            return {
                                status: 'error',
                                errorMessage: ` ** ${'Current Control File Error'.red} unknown value for ${'name'.blue}, expected '${thisPackage_1.ThisPackage.name.green} got '${name.red}' [${controlFilename.gray}]`,
                            };
                        }
                        const { installedPackages, toLinkPackages } = currentControlRawData;
                        // packagesLinked
                        // const installedPackages
                        return {
                            status: 'good',
                            data: {
                                installedPackages,
                                toLinkPackages,
                                allData: currentControlRawData,
                            },
                        };
                    }
                    catch (err) {
                        return {
                            status: 'error',
                            errorObject: err,
                            errorMessage: ` ** ${'Error parsing current control file'.red} ${controlFilename.gray}`,
                        };
                    }
                }
                const controlOptionsParsed = parseControlFileOptions();
                if (controlOptionsParsed.status === 'good') {
                    const { data: _data } = controlOptionsParsed;
                    function processPreviousControlFile(data) {
                        return tslib_1.__awaiter(this, void 0, void 0, function* () {
                            const { installedPackages: { linked: installedPackagesLinked, error: installedPackagesError }, toLinkPackages: { linked: toLinkPackages } } = data;
                            const lastErroredPackages = _.keyBy(installedPackagesError, x => x.fullPackageName);
                            const installedPackagesToRemove = _.differenceWith(toLinkPackages, packagesToLink, (x, y) => x.fullPackageName !== y.fullPackageName);
                            const installedPackagesToRemoveFullPackageNames = installedPackagesToRemove.map(x => x.fullPackageName);
                            // if (installedPackagesToRemove.length > 0) {
                            //   _log.info(ch.gray(`${'Ensure Exists'.white}: ${relativePackageInstallPath.yellow} [${type}]`));
                            //   _log.trace(ch.gray(` -- absolutePackageInstallPath: [${absolutePackageInstallPath.gray}] allowLinksInPackageInstallPath: [${allowLinksInPackageInstallPath ? 'true'.red : 'false'.yellow}] DependantPackages: ${dependantPackages}`))
                            // } else {
                            //   _log.trace(ch.gray(``))
                            // }
                        });
                    }
                }
                else {
                    controlOptionsParsed.errorMessage;
                }
                function linkModuleAsync(info) {
                    return tslib_1.__awaiter(this, void 0, void 0, function* () {
                        const { packageName, fullPackageName, absoluteLinkToSourcePath, relativeLinkToSourcePath, packageInstallHardFolderPath, absolutePackageInstallPath, absoluteSourcePath, absolutePackageDestinationPath, packageDestinationInModules, relativeSourcePath } = info;
                        const messages = logger_1.buildMessagesCore();
                        const core = Object.assign({}, info, { messages, sourceValidation: {
                                status: 'source-not-checked',
                            } });
                        if (validateSourcesExist) {
                            function sourceValidator() {
                                return tslib_1.__awaiter(this, void 0, void 0, function* () {
                                    try {
                                        const statsSource = yield getStatInfo_1.getStatInfo.Async(absoluteSourcePath.clean, false);
                                        if (statsSource.result === 'stat-returned') {
                                            if (statsSource.isDirectory) {
                                                const ret = {
                                                    status: 'source-valid'
                                                };
                                                return ret;
                                            }
                                            else {
                                                const ret = {
                                                    status: 'source-not-directory',
                                                    errorMessage: ` -- ${'Source location exists but is not a directory: '.red} ${fullPackageName.yellow}; Source: ${relativeSourcePath.clean.red} [${absoluteSourcePath.clean.gray}]; Stat: [${JSON.stringify(statsSource, null, 1).gray}]`,
                                                };
                                                return ret;
                                            }
                                        }
                                        else if (statsSource.result === 'not-found') {
                                            const ret = {
                                                status: 'source-not-found',
                                                errorMessage: ` -- ${'Source location was not found: '.red} ${fullPackageName.yellow}; Source: ${relativeSourcePath.clean.red} [${absoluteSourcePath.clean.gray}]`,
                                            };
                                            return ret;
                                        }
                                        else {
                                            const ret = {
                                                status: 'source-stat-error',
                                                errorMessage: ` -- ${'Other error from getStatInfo: '.red} ${fullPackageName.yellow}; Source: ${relativeSourcePath.clean.red} [${absoluteSourcePath.clean.gray}]; Err: [${ch.gray(statsSource.errorObject)}]`,
                                            };
                                            return ret;
                                        }
                                    }
                                    catch (err) {
                                        const ret = {
                                            status: 'source-unhandled-error',
                                            errorMessage: ` -- ${'Unhandled error validating source: '.red} ${fullPackageName.yellow}; Source: ${relativeSourcePath.clean.red} [${absoluteSourcePath.clean.gray}]; err: [${ch.gray(err)}]`,
                                        };
                                        return ret;
                                    }
                                });
                            }
                            core.sourceValidation = yield sourceValidator();
                        }
                        const { sourceValidation: _sv } = core;
                        const _sv_status = _sv.status;
                        let sourceValidationError;
                        if (!(_sv_status === 'source-valid' || _sv_status === 'source-not-checked')) {
                            sourceValidationError = _sv;
                        }
                        if (sourceValidationError) {
                            messages.warn(ch.white(`${`Symlink`.red} [${_sv_status.red}]:  ${fullPackageName.yellow} -> ${relativeSourcePath.clean.red}`));
                        }
                        else {
                            messages.info(ch.white(`${'Symlink'.white}:  ${fullPackageName.yellow} -> ${relativeSourcePath.clean.gray}`));
                        }
                        // messages.trace(ch.gray(` -- absolutePackageInstallPath: [${absolutePackageInstallPath.gray}] allowLinksInPackageInstallPath: [${allowLinksInPackageInstallPath ? 'true'.red : 'false'.yellow}] DependantPackages: ${dependantPackages}`))
                        try {
                            const stats = yield getStatInfo_1.getStatInfo.Async(absolutePackageDestinationPath.clean, false);
                            if (sourceValidationError) {
                                if ((stats.result === 'stat-returned') && (stats.isSymbolicLink)) {
                                    try {
                                        messages.warn(ch.gray(` -- ${'removing target symlink'.red} becuase of source error ${sourceValidationError.status.red}, please validate source exists relative at: ${relativeSourcePath.clean.red} [${absoluteSourcePath.clean.gray}]`));
                                        const resDel = yield del(absolutePackageDestinationPath.clean);
                                        const ret = Object.assign({ status: 'error', statusSub: sourceValidationError.status, errorMessage: sourceValidationError.errorMessage }, core);
                                        return ret;
                                    }
                                    catch (err) {
                                        const ret = Object.assign({ status: 'error', statusSub: 'removing-invalid-source', errorMessage: ` -- ${`Unhandled exception while removing invalid source at [${sourceValidationError.status.white}]:`.red} ${relativeSourcePath.clean.red} [${absoluteSourcePath.clean.gray}]; Err: ${ch.gray(err)}` }, core);
                                        return ret;
                                    }
                                }
                                else {
                                    const ret = Object.assign({ status: 'error', statusSub: sourceValidationError.status, errorMessage: sourceValidationError.errorMessage }, core);
                                    return ret;
                                }
                            }
                            function createSymLink(operationStatus, operationDescription) {
                                return tslib_1.__awaiter(this, void 0, void 0, function* () {
                                    try {
                                        messages.info(ch.gray(` -- ${'linking'.green} ${fullPackageName.yellow} with '${operationDescription}' as '${linkType.blue}' from '${relativeSourcePath.clean.green}' [${absoluteSourcePath.clean.gray}] to '${packageDestinationInModules.clean.green}' [${absolutePackageDestinationPath.clean.gray}]`));
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
                                    try {
                                        messages.trace(ch.gray(` -- install path ${'already a symlink'.blue}, ${'will check expected target'.yellow}: [${relativeLinkToSourcePath.clean.white}]`));
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
                                if (sourceValidationError) {
                                    try {
                                        messages.trace(ch.gray(` -- ${'removing target symlink'.red} becuase of source error ${sourceValidationError.status.red}, please validate source exists relative at: ${relativeSourcePath.clean.red} [${absoluteSourcePath.clean.gray}]`));
                                        const resDel = yield del(absolutePackageDestinationPath.clean);
                                        const ret = Object.assign({ status: 'error', statusSub: sourceValidationError.status, errorMessage: sourceValidationError.errorMessage }, core);
                                        return ret;
                                    }
                                    catch (err) {
                                        const ret = Object.assign({ status: 'error', statusSub: 'removing-invalid-source', errorMessage: ` -- ${`Unhandled exception while removing invalid source at [${sourceValidationError.status.white}]:`.red} ${relativeSourcePath.clean.red} [${absoluteSourcePath.clean.gray}]; Err: ${ch.gray(err)}` }, core);
                                        return ret;
                                    }
                                }
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
                const res = yield Promise.all(packagesToLink.map(val => linkModuleAsync(val)));
                const installedPackages = {
                    linked: res.filter(p => p.status !== 'error'),
                    error: res.filter(p => p.status === 'error'),
                };
                const toLinkPackages = {
                    linked: packagesToLink,
                    error: packagesThatCantLink,
                };
                res.forEach(p => printMessages(p));
                logger_1.GlobalLogger.info('');
                {
                    const { linked, error, } = installedPackages;
                    const totalPackageCount = linked.length + error.length;
                    const colorToUse = linked.length > 0 ? (error.length > 0 ? ch.yellow : ch.green) : ch.red;
                    logger_1.GlobalLogger.warn(`*** ${colorToUse(totalPackageCount).underline} total packages:`);
                    if (linked.length > 0) {
                        logger_1.GlobalLogger.warn(` -- ${ch.green(linked.length)} packages ${'linked'.green}.`);
                    }
                    if (error.length > 0) {
                        logger_1.GlobalLogger.error(` -- ${ch.red(error.length)} packaged ${'failed'.red}.`);
                    }
                    logger_1.GlobalLogger.warn('');
                    const errors = res.filter(p => p.status === 'error');
                    if (errors.length > 0) {
                        const msg = (`${'***'.red} linkModules ${'failed'.red} (${`${errors.length.toString()} error(s)`.red}):
${errors.map((p, dex) => `  ${`${dex + 1}]`.red} ${p.errorMessage.trim()}`).join('  \n')}`);
                        logger_1.GlobalLogger.error(msg);
                    }
                    if (linked.length === 0 && error.length === 0) {
                        logger_1.GlobalLogger.warn(`No packaged were linked!`.yellow);
                    }
                }
                const newControlFileOptions = Object.assign({ when: new Date().toString() }, thisPackage_1.ThisPackage, { caseSensitive,
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
                    rebuild,
                    installedPackages,
                    toLinkPackages });
                try {
                    yield fs.writeJSONAsync(absoluteControlFilePath, newControlFileOptions, { spaces: 2 });
                }
                catch (err) {
                    logger_1.GlobalLogger.error(`${'Error writing control file'.red}: ${absoluteControlFilePath}; err: ${ch.gray(err)}`);
                }
                return newControlFileOptions;
            }
            catch (err) {
                logger_1.GlobalLogger.error(`${'Unhandled Error occurred'.red}: ${ch.gray(err)}`);
                throw err;
            }
        }));
    });
}
exports.moduleLinker = moduleLinker;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0b3Itc3ltLWluc3RhbGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9leGVjdXRvci1zeW0taW5zdGFsbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLGtCQUFnQjtBQUNoQix1Q0FBdUM7QUFFdkMsNEJBQTRCO0FBRTVCLDRCQUE2QjtBQUk3Qix1Q0FBd0M7QUFDeEMsZ0NBQWdDO0FBQ2hDLDJCQUE0QjtBQUU1QixNQUFNLElBQUksR0FBeUIsT0FBTyxDQUFDO0FBSTNDLHFEQUFrRDtBQUNsRCx1REFBb0Q7QUFFcEQsK0NBQTRDO0FBRTVDLHFDQUFrSDtBQUVsSCxxREFBa0Q7QUFHbEQsK0NBQTRDO0FBZ0Q1QyxzQkFBbUMsSUFBMkY7O1FBRTVILElBQUksRUFBRSxXQUFXLEVBQUUsTUFBTSxHQUFHLEVBQUUsRUFBRSxRQUFRLEdBQUcsRUFBRSxFQUFFLFNBQVMsR0FBRyxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFDdkUsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hCLE1BQU0sR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqQyxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDTixFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDL0MsQ0FBQztRQUNILENBQUM7UUFDRCxDQUFDO1lBQ0MsTUFBTSxTQUFTLEdBQUcsR0FBRyxXQUFXLENBQUMsSUFBSSxJQUFJLGVBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzdFLE1BQU0sZUFBZSxHQUFH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