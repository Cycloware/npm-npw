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
            .command(['--no-header', '--noheader'], () => {
            noHeader = true;
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
            noHeader = true;
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
        if (!noHeader) {
            const titleLine = `${'Cycloware'.blue} ${'Module Linker'.green.bold.italic}`;
            const titleLineLength = ch.stripColor(titleLine).length;
            logger_1.GlobalLogger.info(`${titleLine}    
${'-'.repeat(titleLineLength).green}
`);
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0b3Itc3ltLWluc3RhbGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9leGVjdXRvci1zeW0taW5zdGFsbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsa0JBQWdCO0FBRWhCLDRCQUE0QjtBQUU1Qiw0QkFBNkI7QUFJN0IsdUNBQXdDO0FBQ3hDLGdDQUFnQztBQUNoQywyQkFBNEI7QUFFNUIsTUFBTSxJQUFJLEdBQXlCLE9BQU8sQ0FBQztBQUUzQyx1Q0FBb0M7QUFFcEMscURBQWtEO0FBQ2xELHVEQUFvRDtBQUVwRCxxREFBa0Q7QUFDbEQsK0NBQTRDO0FBRTVDLHFDQUFrSDtBQUVsSCxxREFBa0Q7QUFFbEQsK0NBQTRDO0FBK0NyQyxLQUFLLHVCQUF1QixJQUF1SjtJQUd4TCxJQUFJLENBQUM7UUFDSCxJQUFJLEVBQUUsV0FBVyxFQUFFLE1BQU0sR0FBRyxFQUFFLEVBQUUsUUFBUSxHQUFHLEVBQUUsRUFBRSxTQUFTLEdBQUcsRUFBRSxFQUFFLFFBQVEsR0FBRyxLQUFLLEVBQUUsNEJBQTRCLEdBQUcsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBQy9ILEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4QixNQUFNLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakMsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ04sRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMxQixNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQy9DLENBQUM7UUFDSCxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FB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