"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
require("colors");
// import * as Promise from 'bluebird';
const _ = require("lodash");
const ch = require("chalk");
const fs = require("fs-extra-promise");
const pathMod = require("path");
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
                        const { packagesLinked } = currentControlRawData;
                        // const installedPackages
                        return {
                            status: 'good',
                            options: {
                                installedPackages: packagesToLink,
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
                    controlOptionsParsed.options;
                }
                else {
                    controlOptionsParsed.errorMessage;
                }
                function linkModuleAsync(info) {
                    return tslib_1.__awaiter(this, void 0, void 0, function* () {
                        const { packageName, fullPackageName, absoluteLinkToSourcePath, relativeLinkToSourcePath, packageInstallHardFolderPath, absolutePackageInstallPath, absoluteSourcePath, absolutePackageDestinationPath, relativeSourcePath } = info;
                        const messages = logger_1.buildMessagesCore();
                        const core = Object.assign({}, info, { messages, sourceValidation: {
                                status: 'source-not-checked',
                            } });
                        messages.info(ch.white(`${'Symlink'.white}:  ${fullPackageName.yellow} -> ${relativeSourcePath.clean.gray}`));
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
                        // messages.trace(ch.gray(` -- absolutePackageInstallPath: [${absolutePackageInstallPath.gray}] allowLinksInPackageInstallPath: [${allowLinksInPackageInstallPath ? 'true'.red : 'false'.yellow}] DependantPackages: ${dependantPackages}`))
                        try {
                            const stats = yield getStatInfo_1.getStatInfo.Async(absolutePackageDestinationPath.clean, false);
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
                                    messages.trace(ch.gray(` -- install path ${'already a symlink'.blue}, ${'will check expected target'.yellow}: [${relativeLinkToSourcePath.clean.white}]`));
                                    try {
                                        const { sourceValidation } = core;
                                        switch (sourceValidation.status) {
                                            case 'source-valid':
                                            case 'source-not-checked':
                                                break;
                                            default:
                                                {
                                                    messages.trace(ch.gray(` -- removing target ${sourceValidation.status.red}, please validate source exists relative at: ${relativeSourcePath.clean.red} [${absoluteSourcePath.clean.gray}]`));
                                                    try {
                                                        const resDel = yield fs.removeAsync(absolutePackageDestinationPath.clean);
                                                        const ret = Object.assign({ status: 'error', statusSub: sourceValidation.status, errorMessage: sourceValidation.errorMessage }, core);
                                                        return ret;
                                                    }
                                                    catch (err) {
                                                        const ret = Object.assign({ status: 'error', statusSub: 'removing-invalid-source', errorMessage: ` -- ${'Error removing invalid source at: '.red} ${relativeSourcePath.clean.red} [${absoluteSourcePath.clean.gray}]; Err: ${ch.gray(err)}` }, core);
                                                        return ret;
                                                    }
                                                }
                                        }
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
                                                const resDel = yield fs.removeAsync(absolutePackageDestinationPath.clean);
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
                const res = yield Promise.all(packagesToLink.map(val => linkModuleAsync(val)));
                const packagesLinked = [];
                const packagesCompleted = {
                    linked: res.filter(p => p.status !== 'error'),
                    error: res.filter(p => p.status === 'error'),
                };
                res.forEach(p => printMessages(p));
                logger_1.GlobalLogger.info('');
                {
                    const { linked, error, } = packagesCompleted;
                    if (linked.length > 0) {
                        logger_1.GlobalLogger.warn(`Linked ${ch.green(linked.length)} packages.`);
                    }
                    if (error.length > 0) {
                        logger_1.GlobalLogger.error(`${'Failed'.red} to link ${ch.green(error.length)} packages.`);
                    }
                    const errors = res.filter(p => p.status === 'error');
                    if (errors.length > 0) {
                        const msg = (`${'***'.yellow} linkModules failed for [${errors.length.toString().red}]:
        ${errors.map(p => p.errorMessage).join('  \n')}`);
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
                    packagesCompleted,
                    packagesLinked, packagesToLinkCount: packagesToLink.length, packagesToLink, packagesThatCantLinkCount: packagesThatCantLink.length, packagesThatCantLink });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0b3ItbW9kdWxlLWxpbmtlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9leGVjdXRvci1tb2R1bGUtbGlua2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLGtCQUFnQjtBQUNoQix1Q0FBdUM7QUFFdkMsNEJBQTRCO0FBRTVCLDRCQUE2QjtBQUk3Qix1Q0FBd0M7QUFDeEMsZ0NBQWdDO0FBR2hDLE1BQU0sSUFBSSxHQUF5QixPQUFPLENBQUM7QUFJM0MscURBQWtEO0FBQ2xELHVEQUFvRDtBQUVwRCwrQ0FBNEM7QUFFNUMscUNBQTBHO0FBRTFHLHFEQUFrRDtBQUdsRCwrQ0FBNEM7QUFnRDVDLHNCQUFtQyxJQUEyRjs7UUFFNUgsSUFBSSxFQUFFLFdBQVcsRUFBRSxNQUFNLEdBQUcsRUFBRSxFQUFFLFFBQVEsR0FBRyxFQUFFLEVBQUUsU0FBUyxHQUFHLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQztRQUN2RSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEIsTUFBTSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2pDLENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNOLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDMUIsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUMvQyxDQUFDO1FBQ0gsQ0FBQztRQUNELENBQUM7WUFDQyxNQUFNLFNBQVMsR0FBRyxHQUFHLFdBQVcsQ0FBQyxJQUFJLElBQUksZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDN0UsTUFBTSxlQUFlLEdBQUcsRUFBRSxDQUFDLFVB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