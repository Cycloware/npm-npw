"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("colors");
const _ = require("lodash");
const ch = require("chalk");
const fs = require("fs-extra-promise");
const pathMod = require("path");
const del = require("del");
const path = pathMod;
const unquote_1 = require("./unquote");
const commandBuilder_1 = require("./commandBuilder");
const changeDirectory_1 = require("./changeDirectory");
const getPackageInfo_1 = require("./getPackageInfo");
const getStatInfo_1 = require("./getStatInfo");
const logger_1 = require("./logger");
const stringComparer_1 = require("./stringComparer");
const thisPackage_1 = require("./thisPackage");
async function moduleLinker(exec) {
    try {
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
        let moduleNameVerification = undefined;
        const packageFilename = 'package.json';
        let uninstall = false;
        const commands = commandBuilder_1.CommandBuilder.Start()
            .command(['--target'], ({ taken }) => {
            moduleTarget = unquote_1.unquote(taken[0]);
            moduleTargetSource = 'command';
        }, {
            nArgs: 1,
        })
            .command(['--no-verify', '--verify-none'], () => {
            moduleNameVerification = false;
        })
            .command(['--verify', '--verify-full'], () => {
            moduleNameVerification = true;
        })
            .command(['--rebuild'], () => {
            rebuild = true;
        })
            .command(['--uninstall'], () => {
            uninstall = true;
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
        const packageResult = await getPackageInfo_1.getPackageInfo(absolutePackagePath);
        if (packageResult.result !== 'success') {
            logger_1.GlobalLogger.error(packageResult.message);
            throw new Error(packageResult.message.strip);
        }
        logger_1.GlobalLogger.warn('');
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
                    logger_1.GlobalLogger.error(msg);
                    throw new Error(msg.strip);
                }
            }
            if (moduleNameVerification === undefined) {
                const { moduleNameVerification: _mnv } = linkModuleOptions;
                if (typeof _mnv === 'boolean') {
                    moduleNameVerification = _mnv;
                }
            }
        }
        if (moduleNameVerification === undefined) {
            moduleNameVerification = true;
        }
        const absoluteModuleDir = path.resolve(absoluteBaseDir, moduleTarget);
        const relativeModuleDir = path.relative(absoluteBaseDir, absoluteModuleDir);
        const currentDirectory = process.cwd();
        logger_1.GlobalLogger.trace(` + moduleTarget: ${moduleTarget.blue}`);
        logger_1.GlobalLogger.trace(` + absoluteBaseDir: ${absoluteBaseDir.blue}`);
        logger_1.GlobalLogger.trace(` + absoluteModuleDir: ${absoluteModuleDir.blue}`);
        logger_1.GlobalLogger.trace(` + currentDirectory: ${currentDirectory.blue}`);
        return await changeDirectory_1.ChangeDirectory.Async({
            absoluteNewCurrentDirectory: absoluteModuleDir
        }, async (state) => {
            try {
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
                    currentControlRawData = await fs.readJsonAsync(absoluteControlFilePath);
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
                        async function processPreviousControlFile(data) {
                            const { toLinkPackages: { linked: existingPackagesToLink }, installedPackagesNotRemoved: existingPackagesNotRemoved } = data;
                            let allInstalledPackagesToRemove = _.unionBy(existingPackagesToLink, existingPackagesNotRemoved, x => x.fullPackageName);
                            let installedPackagesToRemoveC = allInstalledPackagesToRemove;
                            if (!(rebuild || uninstall)) {
                                installedPackagesToRemoveC = _.differenceBy(allInstalledPackagesToRemove, packagesToLink, x => x.fullPackageName);
                            }
                            installedPackagesToRemoveFullPackageNames = installedPackagesToRemoveC.map(x => x.fullPackageName);
                            // if (existingPackagesNotRemoved.length > 0) {
                            //   _log.warn(`Retrying to remove`)
                            // }
                            if (installedPackagesToRemoveC.length > 0) {
                                logger_1.GlobalLogger.warn(ch.gray(`${'Unlink Packages'.white}: ${`removing ${installedPackagesToRemoveC.length} symlinks`.blue}${rebuild ? ` for rebuild` : uninstall ? ` for uninstall` : ''} [${installedPackagesToRemoveFullPackageNames.map(p => p.yellow).join(', '.white)}]`));
                                let needsDeleteTargets = false;
                                for (const info of installedPackagesToRemoveC) {
                                    const { fullPackageName, relativeSourcePath: { clean: relativeSourcePath = '' }, absolutePackageDestinationPath: { clean: absolutePackageDestinationPath = '' } } = info;
                                    try {
                                        logger_1.GlobalLogger.info(ch.gray(` -- ${'removing'.blue} - ${fullPackageName.yellow} -> ${relativeSourcePath.gray}`));
                                        const stats = await getStatInfo_1.getStatInfo.Async(absolutePackageDestinationPath, false);
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
                                        const resDel = await del(absolutePackageDestinationPath);
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
                        }
                        await processPreviousControlFile(_data);
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
                async function ensureInstallPathPresent(install) {
                    const messages = logger_1.buildMessagesCore();
                    const core = { install, messages, };
                    try {
                        const { absolutePackageInstallPath, relativePackageInstallPath, dependantPackages, name, type } = install;
                        messages.info(ch.gray(`${'Ensure Exists'.white}: ${relativePackageInstallPath.yellow} [${type}]`));
                        messages.trace(ch.gray(` -- absolutePackageInstallPath: [${absolutePackageInstallPath.gray}] allowLinksInPackageInstallPath: [${allowLinksInPackageInstallPath ? 'true'.red : 'false'.yellow}] DependantPackages: ${dependantPackages}`));
                        const stats = await getStatInfo_1.getStatInfo.Async(absolutePackageInstallPath, allowLinksInPackageInstallPath);
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
                            await fs.mkdirAsync(absolutePackageInstallPath);
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
                const resInstallPaths = await ensureInstallPathPresent(moduleDirInstallInfo);
                printMessages(resInstallPaths);
                if (resInstallPaths.status === 'error') {
                    throw new Error(ch.stripColor(resInstallPaths.errorMessage));
                }
                if (ensureInstallPathsPresent.length > 0) {
                    const resInstallAllPaths = await Promise.all(ensureInstallPathsPresent.map(x => ensureInstallPathPresent(x)));
                    resInstallAllPaths.forEach(p => printMessages(p));
                    const errorInstallPaths = resInstallAllPaths.filter(p => p.status === 'error');
                    if (errorInstallPaths.length > 0) {
                        throw new Error(ch.stripColor(`Package Install Paths failed for:
  ${errorInstallPaths.map(p => p.errorMessage).join('  \n')}`));
                    }
                }
                logger_1.GlobalLogger.info('');
                async function linkModuleAsync(info) {
                    const { packageName, fullPackageName, absoluteLinkToSourcePath, relativeLinkToSourcePath, packageInstallHardFolderPath, absolutePackageInstallPath, absoluteSourcePath, absolutePackageDestinationPath, packageDestinationInModules, relativeSourcePath } = info;
                    const absoluteSourcePathClean = absoluteSourcePath.clean;
                    const messages = logger_1.buildMessagesCore();
                    const core = Object.assign({}, info, { messages, sourceValidation: {
                            status: 'source-not-checked',
                        } });
                    if (validateSourcesExist) {
                        async function sourceValidator() {
                            try {
                                const statsSource = await getStatInfo_1.getStatInfo.Async(absoluteSourcePathClean, false);
                                if (statsSource.result === 'stat-returned') {
                                    if (statsSource.isDirectory) {
                                        if (moduleNameVerification) {
                                            const sourcePackageInfoPath = path.join(absoluteSourcePathClean, 'package.json');
                                            const resPackageInfo = await getPackageInfo_1.getPackageInfo(sourcePackageInfoPath);
                                            if (resPackageInfo.result === 'success') {
                                                const { packageInfo } = resPackageInfo;
                                                if (packageInfo.name) {
                                                    if (fullPackageName !== packageInfo.name) {
                                                        const insensitiveMatch = stringComparer_1.stringComparer.Insensitive(fullPackageName, packageInfo.name);
                                                        let msg = ` -- Source package name is '${packageInfo.name.red}' and does not match name '${fullPackageName.red}' listed in the section '${sectionName.red}' of package file [${absolutePackagePath.gray}].`;
                                                        if (insensitiveMatch) {
                                                            msg += `
    ${'*** names only differ by case ***'.red}`;
                                                        }
                                                        const ret = {
                                                            status: 'source-package-name-mismatch',
                                                            errorMessage: msg,
                                                        };
                                                        return ret;
                                                    }
                                                    else {
                                                        const ret = {
                                                            status: 'source-valid'
                                                        };
                                                        return ret;
                                                    }
                                                }
                                                else {
                                                    const ret = {
                                                        status: 'source-package-has-no-name',
                                                        errorMessage: ` -- ${'No name property'.red} in source package.json file [${sourcePackageInfoPath.grey}].  TargetPackage: ${fullPackageName.yellow}; Source: ${relativeSourcePath.clean.red} [${absoluteSourcePathClean.gray}].`,
                                                    };
                                                    return ret;
                                                }
                                            }
                                            else {
                                                if (resPackageInfo.result === 'not-found') {
                                                    const ret = {
                                                        status: 'source-has-no-package-info',
                                                        errorMessage: ` -- ${'No package.json file.'.red} in source location directory.  TargetPackage: ${fullPackageName.yellow}; Source: ${relativeSourcePath.clean.red} [${absoluteSourcePathClean.gray}].`,
                                                    };
                                                    return ret;
                                                }
                                                else {
                                                    const ret = {
                                                        status: 'source-package-info-error',
                                                        errorMessage: ` -- ${'Other error'.red} try to read package.json file.  TargetPackage: ${fullPackageName.yellow}; Source: ${relativeSourcePath.clean.red} [${absoluteSourcePathClean.gray}]; err: [${ch.grey(resPackageInfo.err)}]`,
                                                    };
                                                    return ret;
                                                }
                                            }
                                        }
                                        else {
                                            const ret = {
                                                status: 'source-valid'
                                            };
                                            return ret;
                                        }
                                    }
                                    else {
                                        const ret = {
                                            status: 'source-not-directory',
                                            errorMessage: ` -- ${'Source location exists but is not a directory: '.red} ${fullPackageName.yellow}; Source: ${relativeSourcePath.clean.red} [${absoluteSourcePathClean.gray}]; Stat: [${JSON.stringify(statsSource, null, 1).gray}]`,
                                        };
                                        return ret;
                                    }
                                }
                                else if (statsSource.result === 'not-found') {
                                    const ret = {
                                        status: 'source-not-found',
                                        errorMessage: ` -- ${'Source location was not found: '.red} ${fullPackageName.yellow}; Source: ${relativeSourcePath.clean.red} [${absoluteSourcePathClean.gray}]`,
                                    };
                                    return ret;
                                }
                                else {
                                    const ret = {
                                        status: 'source-stat-error',
                                        errorMessage: ` -- ${'Other error from getStatInfo: '.red} ${fullPackageName.yellow}; Source: ${relativeSourcePath.clean.red} [${absoluteSourcePathClean.gray}]; Err: [${ch.gray(statsSource.errorObject)}]`,
                                    };
                                    return ret;
                                }
                            }
                            catch (err) {
                                const ret = {
                                    status: 'source-unhandled-error',
                                    errorMessage: ` -- ${'Unhandled error validating source: '.red} ${fullPackageName.yellow}; Source: ${relativeSourcePath.clean.red} [${absoluteSourcePathClean.gray}]; err: [${ch.gray(err)}]`,
                                };
                                return ret;
                            }
                        }
                        core.sourceValidation = await sourceValidator();
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
                        const stats = await getStatInfo_1.getStatInfo.Async(absolutePackageDestinationPath.clean, false);
                        if (sourceValidationError) {
                            if ((stats.result === 'stat-returned') && (stats.isSymbolicLink)) {
                                try {
                                    messages.warn(ch.gray(` -- ${'removing target symlink'.red} because of source error ${sourceValidationError.status.red}, please validate source exists relative at: ${relativeSourcePath.clean.red} [${absoluteSourcePath.clean.gray}]`));
                                    const resDel = await del(absolutePackageDestinationPath.clean);
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
                        async function createSymLink(operationStatus, operationDescription) {
                            try {
                                messages.info(ch.gray(` -- ${'linking'.green} ${fullPackageName.yellow} by ${operationDescription} as '${linkType.blue}' from '${relativeSourcePath.clean.green}' [${absoluteSourcePath.clean.gray}] to '${packageDestinationInModules.clean.green}' [${absolutePackageDestinationPath.clean.gray}]`));
                                await fs.symlinkAsync(relativeLinkToSourcePath.clean, absolutePackageDestinationPath.clean, linkType);
                                messages.info(ch.gray(` -- ${'LINKED'.green}'`));
                                const ret = Object.assign({ status: operationStatus }, core);
                                return ret;
                            }
                            catch (err) {
                                const ret = Object.assign({ status: 'error', statusSub: 'creating-symlink', errorMessage: `${' -- Error creating symlink: '.red} with '${operationDescription}' as '${linkType.blue}' from '${relativeSourcePath.clean.green} [${absoluteSourcePath.clean.gray}]; Err: ${ch.gray(err)}` }, core);
                                return ret;
                            }
                        }
                        if (stats.result === 'stat-returned') {
                            if (stats.isSymbolicLink) {
                                try {
                                    messages.trace(ch.gray(` -- install path ${'already a symlink'.blue}, ${'will check expected target'.yellow}: [${relativeLinkToSourcePath.clean.white}]`));
                                    const res = await fs.readlinkAsync(absolutePackageDestinationPath.clean);
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
                                            const resDel = await del(absolutePackageDestinationPath.clean);
                                            return await createSymLink('mapped-recreate', 'recreating symlink'.yellow.underline);
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
                                    const resDel = await del(absolutePackageDestinationPath.clean);
                                    const ret = Object.assign({ status: 'error', statusSub: sourceValidationError.status, errorMessage: sourceValidationError.errorMessage }, core);
                                    return ret;
                                }
                                catch (err) {
                                    const ret = Object.assign({ status: 'error', statusSub: 'removing-invalid-source', errorMessage: ` -- ${`Unhandled exception while removing invalid source at [${sourceValidationError.status.white}]:`.red} ${relativeSourcePath.clean.red} [${absoluteSourcePath.clean.gray}]; Err: ${ch.gray(err)}` }, core);
                                    return ret;
                                }
                            }
                            return await createSymLink('mapped-fresh', 'creating new symlink'.green.underline);
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
                }
                const res = uninstall ? [] : await Promise.all(packagesToLink.map(val => linkModuleAsync(val)));
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
                        logger_1.GlobalLogger.warn(`*** ${ch.blue(`${installedPackagesToRemove.length} unused symlinks${rebuild ? ` for rebuild` : uninstall ? ` for uninstall` : ''}`)} removed
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
                    uninstall,
                    installedPackages,
                    toLinkPackages, installedPackagesRemoved: installedPackagesToRemove, installedPackagesNotRemoved });
                try {
                    await fs.writeJSONAsync(absoluteControlFilePath, newControlFileOptions, { spaces: 2 });
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
        });
    }
    catch (err) {
        logger_1.GlobalLogger.error(`${'Unhandled Error occurred - outer'.red}: ${ch.gray(err)}`);
    }
}
exports.moduleLinker = moduleLinker;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0b3Itc3ltLWluc3RhbGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9leGVjdXRvci1zeW0taW5zdGFsbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsa0JBQWdCO0FBRWhCLDRCQUE0QjtBQUU1Qiw0QkFBNkI7QUFJN0IsdUNBQXdDO0FBQ3hDLGdDQUFnQztBQUNoQywyQkFBNEI7QUFFNUIsTUFBTSxJQUFJLEdBQXlCLE9BQU8sQ0FBQztBQUUzQyx1Q0FBb0M7QUFFcEMscURBQWtEO0FBQ2xELHVEQUFvRDtBQUVwRCxxREFBa0Q7QUFDbEQsK0NBQTRDO0FBRTVDLHFDQUFrSDtBQUVsSCxxREFBa0Q7QUFFbEQsK0NBQTRDO0FBK0NyQyxLQUFLLHVCQUF1QixJQUF1SjtJQUd4TCxJQUFJLENBQUM7UUFDSCxJQUFJLEVBQUUsV0FBVyxFQUFFLE1BQU0sR0FBRyxFQUFFLEVBQUUsUUFBUSxHQUFHLEVBQUUsRUFBRSxTQUFTLEdBQUcsRUFBRSxFQUFFLFFBQVEsR0FBRyxLQUFLLEVBQUUsNEJBQTRCLEdBQUcsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBQy9ILEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4QixNQUFNLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakMsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ04sRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMxQixNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQy9DLENBQUM7UUFDSCxDQUFDO1FBQ0QsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lB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