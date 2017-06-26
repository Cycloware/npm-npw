"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
require("colors");
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
        let { commandText, argsIn = [], argsAsIs = [], argsToNpm = [], noHeader = false, noEmptyPackageSectionMessage = false } = exec;
        if (argsIn.length === 0) {
            argsIn = process.argv.slice(2);
        }
        else {
            if (argsAsIs.length === 0) {
                argsIn = argsIn.concat(process.argv.slice(2));
            }
        }
        if (!noHeader) {
            const titleLine = `${'Cycloware'.blue} ${'Module Linker'.green.bold.italic}`;
            const titleLineLength = ch.stripColor(titleLine).length;
            logger_1.GlobalLogger.info(`${titleLine}    
${'-'.repeat(titleLineLength).green}
`);
        }
        const baseDir = process.cwd();
        const absoluteBaseDir = path.resolve(baseDir);
        let controlFilename = '.cw_module_links';
        let moduleTarget = 'node_modules';
        let moduleTargetSource = 'default';
        let rebuild = false;
        let validateSourcesExist = true;
        let allowLinksInPackageInstallPath = false;
        let caseSensitive = false;
        let deleteTargets = false;
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
            .command(['--delete-targets'], () => {
            deleteTargets = true;
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
        const sectionName = 'cw:symlinkModules';
        const sectionOptionsName = 'cw:symlinkModules:options';
        const { packageInfo } = packageResult;
        const packagesToInclude = packageInfo[sectionName];
        if (typeof packagesToInclude !== 'object') {
            const mes = `No section '${sectionName.yellow}' in package.json`;
            if (!noEmptyPackageSectionMessage) {
                logger_1.GlobalLogger.error(mes);
            }
            return mes.strip;
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
        return yield changeDirectory_1.ChangeDirectory.Async({
            absoluteNewCurrentDirectory: absoluteModuleDir
        }, (state) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
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
                const absoluteControlFilePath = path.resolve(absoluteModuleDir, controlFilename);
                let currentControlRawData;
                try {
                    currentControlRawData = yield fs.readJsonAsync(absoluteControlFilePath);
                }
                catch (err) {
                    if (err.code !== 'ENOENT') {
                        const msg = `${'FAILED:  '.red} to open an exsiting control file '${controlFilename.yellow}' at '${absoluteModuleDir.gray}.
          
 *** ${'Delete the file and retry if you want to continue or make sure it is not locked!'.yellow.underline}
  
Err: ${ch.gray(err)}`;
                        logger_1.GlobalLogger.error(msg);
                        throw new Error(msg.strip);
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
                        const { installedPackages, toLinkPackages, installedPackagesNotRemoved } = currentControlRawData;
                        // packagesLinked
                        // const installedPackages
                        return {
                            status: 'good',
                            data: {
                                installedPackages,
                                installedPackagesNotRemoved,
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
                let installedPackagesToRemoveFullPackageNames = [];
                let installedPackagesToRemove = [];
                let installedPackagesNotRemoved = [];
                if (controlOptionsParsed.status === 'good') {
                    try {
                        const { data: _data } = controlOptionsParsed;
                        function processPreviousControlFile(data) {
                            return tslib_1.__awaiter(this, void 0, void 0, function* () {
                                const { toLinkPackages: { linked: existingPackagesToLink }, installedPackagesNotRemoved: existingPackagesNotRemoved } = data;
                                let allInstalledPackagesToRemove = _.unionBy(existingPackagesToLink, existingPackagesNotRemoved, x => x.fullPackageName);
                                let installedPackagesToRemoveC = allInstalledPackagesToRemove;
                                if (!rebuild) {
                                    installedPackagesToRemoveC = _.differenceBy(allInstalledPackagesToRemove, packagesToLink, x => x.fullPackageName);
                                }
                                installedPackagesToRemoveFullPackageNames = installedPackagesToRemoveC.map(x => x.fullPackageName);
                                // if (existingPackagesNotRemoved.length > 0) {
                                //   _log.warn(`Retrying to remove`)
                                // }
                                if (installedPackagesToRemoveC.length > 0) {
                                    logger_1.GlobalLogger.warn(ch.gray(`${'Unlink Packages'.white}: ${`removing ${installedPackagesToRemoveC.length} symlinks`.blue}${rebuild ? ` for rebuild` : ''} [${installedPackagesToRemoveFullPackageNames.map(p => p.yellow).join(', '.white)}]`));
                                    let needsDeleteTargets = false;
                                    for (const info of installedPackagesToRemoveC) {
                                        const { fullPackageName, relativeSourcePath: { clean: relativeSourcePath = '' }, absolutePackageDestinationPath: { clean: absolutePackageDestinationPath = '' } } = info;
                                        try {
                                            logger_1.GlobalLogger.info(ch.gray(` -- ${'removing'.blue} - ${fullPackageName.yellow} -> ${relativeSourcePath.gray}`));
                                            const stats = yield getStatInfo_1.getStatInfo.Async(absolutePackageDestinationPath, false);
                                            if (stats.result === 'stat-returned') {
                                                if (!stats.isSymbolicLink && !deleteTargets) {
                                                    logger_1.GlobalLogger.error(`    * cannot remove symlink because target ${'not a symbolic link'.underline.red} it is a ${stats.type.red}, target: ${absolutePackageDestinationPath.gray}.`);
                                                    logger_1.GlobalLogger.trace(`    * stats: [${JSON.stringify(stats, null, 0).gray}]`);
                                                    installedPackagesNotRemoved.push(info);
                                                    needsDeleteTargets = true;
                                                    continue;
                                                }
                                            }
                                            else if (stats.result === 'not-found') {
                                                logger_1.GlobalLogger.warn(ch.gray(` -- ${"symlink doesn't exist".blue} (${'this is strange but not an error'.white.underline}) - ${fullPackageName.yellow} -> ${relativeSourcePath.gray}`));
                                            }
                                            else {
                                                logger_1.GlobalLogger.error(ch.gray(` -- ${"error getting symlik stats".red} - ${fullPackageName.yellow} -> ${relativeSourcePath.gray}`));
                                                logger_1.GlobalLogger.error(ch.gray(`    * msg:  ${stats.message}; err: ${stats.errorObject}`));
                                            }
                                            const resDel = yield del(absolutePackageDestinationPath);
                                            installedPackagesToRemove.push(info);
                                        }
                                        catch (err) {
                                            logger_1.GlobalLogger.error(` -- ${'error removing'.red} package '${ch.underline(fullPackageName)}' symlink at '${absolutePackageDestinationPath.gray}'`);
                                            installedPackagesNotRemoved.push(info);
                                        }
                                    }
                                    if (needsDeleteTargets) {
                                        logger_1.GlobalLogger.error(``);
                                        logger_1.GlobalLogger.error(`*** To delete targets that are not symlinks run with ${`--delete-targets`.yellow}`.red);
                                    }
                                    logger_1.GlobalLogger.warn('');
                                }
                                else {
                                    logger_1.GlobalLogger.info(ch.gray(`${'Unlink Packages'.white}: ${`nothing to remove`.yellow}`));
                                    logger_1.GlobalLogger.info('');
                                }
                            });
                        }
                        yield processPreviousControlFile(_data);
                    }
                    catch (err) {
                        const msg = `${'Error'.red} parsing control file options.  Err: ${err}`;
                        logger_1.GlobalLogger.error(msg);
                        throw new Error(msg.strip);
                    }
                }
                else {
                    controlOptionsParsed.errorMessage;
                }
                if (packagesThatCantLink.length > 0) {
                    logger_1.GlobalLogger.warn(` + ${'BAD packagesThatCantLink'.red} ${`package paths must start with '${filePrefix.green}'`}: ${packagesThatCantLink.map(x => `${x.fullPackageName.gray}: ${x.rawValue.yellow}`).join('; ')}`);
                }
                if (packagesToLink.length > 0) {
                    logger_1.GlobalLogger.trace(ch.gray(`${' + packagesToLink'.white} [${ch.white(packagesToLink.length)}]: ${packagesToLink.map(x => `${x.fullPackageName.yellow} [${x.rawValue.white}]`).join(', ')}
`));
                }
                else {
                    logger_1.GlobalLogger.warn(` + No ${'packages to symlink'.yellow}.
`);
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
                const resInstallPaths = yield ensureInstallPathPresent(moduleDirInstallInfo);
                printMessages(resInstallPaths);
                if (resInstallPaths.status === 'error') {
                    throw new Error(ch.stripColor(resInstallPaths.errorMessage));
                }
                if (ensureInstallPathsPresent.length > 0) {
                    const resInstallAllPaths = yield Promise.all(ensureInstallPathsPresent.map(x => ensureInstallPathPresent(x)));
                    resInstallAllPaths.forEach(p => printMessages(p));
                    const errorInstallPaths = resInstallAllPaths.filter(p => p.status === 'error');
                    if (errorInstallPaths.length > 0) {
                        throw new Error(ch.stripColor(`Package Install Paths failed for:
  ${errorInstallPaths.map(p => p.errorMessage).join('  \n')}`));
                    }
                }
                logger_1.GlobalLogger.info('');
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
                                        messages.warn(ch.gray(` -- ${'removing target symlink'.red} because of source error ${sourceValidationError.status.red}, please validate source exists relative at: ${relativeSourcePath.clean.red} [${absoluteSourcePath.clean.gray}]`));
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
                                        messages.info(ch.gray(` -- ${'linking'.green} ${fullPackageName.yellow} by ${operationDescription} as '${linkType.blue}' from '${relativeSourcePath.clean.green}' [${absoluteSourcePath.clean.gray}] to '${packageDestinationInModules.clean.green}' [${absolutePackageDestinationPath.clean.gray}]`));
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
                                                return yield createSymLink('mapped-recreate', 'recreating symlink'.yellow.underline);
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
                                    const ret = Object.assign({ status: 'error', statusSub: 'exist-not-symlink', errorMessage: ` -- Target location exists but is ${'not a symbolic link: '.red} it is a ${stats.type.red} ${fullPackageName.yellow}; Location [${absolutePackageDestinationPath.clean.gray}]; Stat: [${JSON.stringify(stats, null, 1).gray}]` }, core);
                                    return ret;
                                }
                            }
                            else if (stats.result === 'not-found') {
                                if (sourceValidationError) {
                                    try {
                                        messages.trace(ch.gray(` -- ${'removing target symlink'.red} because of source error ${sourceValidationError.status.red}, please validate source exists relative at: ${relativeSourcePath.clean.red} [${absoluteSourcePath.clean.gray}]`));
                                        const resDel = yield del(absolutePackageDestinationPath.clean);
                                        const ret = Object.assign({ status: 'error', statusSub: sourceValidationError.status, errorMessage: sourceValidationError.errorMessage }, core);
                                        return ret;
                                    }
                                    catch (err) {
                                        const ret = Object.assign({ status: 'error', statusSub: 'removing-invalid-source', errorMessage: ` -- ${`Unhandled exception while removing invalid source at [${sourceValidationError.status.white}]:`.red} ${relativeSourcePath.clean.red} [${absoluteSourcePath.clean.gray}]; Err: ${ch.gray(err)}` }, core);
                                        return ret;
                                    }
                                }
                                return yield createSymLink('mapped-fresh', 'creating new symlink'.green.underline);
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
                    if (installedPackagesToRemove.length > 0) {
                        logger_1.GlobalLogger.warn(`*** ${ch.blue(`${installedPackagesToRemove.length} unused symlinks${rebuild ? ` for rebuild` : ''}`)} removed
`);
                    }
                    if (totalPackageCount > 0) {
                        logger_1.GlobalLogger.warn(`*** ${colorToUse(`${totalPackageCount} total`).underline} packages:`);
                        if (linked.length > 0) {
                            logger_1.GlobalLogger.warn(` -- ${ch.green(linked.length)} packages ${'symlinked'.green}.`);
                        }
                        if (error.length > 0) {
                            logger_1.GlobalLogger.error(` -- ${ch.red(error.length)} packaged ${'failed'.red}.`);
                        }
                        logger_1.GlobalLogger.warn('');
                    }
                    const errors = res.filter(p => p.status === 'error');
                    if (errors.length > 0) {
                        const msg = (`${'***'.red} symlinkModules ${'failed'.red} (${`${errors.length.toString()} error(s)`.red}):
${errors.map((p, dex) => `  ${`${dex + 1}]`.red} ${p.errorMessage.trim()}`).join('  \n')}`);
                        logger_1.GlobalLogger.error(msg);
                    }
                    if (linked.length === 0 && error.length === 0) {
                        logger_1.GlobalLogger.warn(`*** No packaged were symlinked! ***

`.yellow);
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
                    toLinkPackages, installedPackagesRemoved: installedPackagesToRemove, installedPackagesNotRemoved });
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
