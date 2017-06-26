"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
async function moduleLinker(exec) {
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
    async function getPackageInfo(packagePath) {
        try {
            return { success: true, packageInfo: await fs.readJSONAsync(packagePath) };
        }
        catch (err) {
            return { success: false, err, message: `Error loading package.json '${packagePath.gray}'; err: ${ch.gray(err)}` };
        }
    }
    const packageResult = await getPackageInfo(absolutePackagePath);
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
        return mes;
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
    return await changeDirectory_1.ChangeDirectory.Async({
        absoluteNewCurrentDirectory: absoluteModuleDir
    }, async (state) => {
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
                    async function processPreviousControlFile(data) {
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
                logger_1.GlobalLogger.warn(` + No ${'packagesToLink'.yellow} to symlin.
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
                const messages = logger_1.buildMessagesCore();
                const core = Object.assign({}, info, { messages, sourceValidation: {
                        status: 'source-not-checked',
                    } });
                if (validateSourcesExist) {
                    async function sourceValidator() {
                        try {
                            const statsSource = await getStatInfo_1.getStatInfo.Async(absoluteSourcePath.clean, false);
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
            const res = await Promise.all(packagesToLink.map(val => linkModuleAsync(val)));
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
                    const msg = (`${'***'.red} linkModules ${'failed'.red} (${`${errors.length.toString()} error(s)`.red}):
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
exports.moduleLinker = moduleLinker;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0b3Itc3ltLWluc3RhbGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9leGVjdXRvci1zeW0taW5zdGFsbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsa0JBQWdCO0FBQ2hCLHVDQUF1QztBQUV2Qyw0QkFBNEI7QUFFNUIsNEJBQTZCO0FBSTdCLHVDQUF3QztBQUN4QyxnQ0FBZ0M7QUFDaEMsMkJBQTRCO0FBRTVCLE1BQU0sSUFBSSxHQUF5QixPQUFPLENBQUM7QUFJM0MscURBQWtEO0FBQ2xELHVEQUFvRDtBQUVwRCwrQ0FBNEM7QUFFNUMscUNBQWtIO0FBRWxILHFEQUFrRDtBQUdsRCwrQ0FBNEM7QUFnRHJDLEtBQUssdUJBQXVCLElBQTJGO0lBRTVILElBQUksRUFBRSxXQUFXLEVBQUUsTUFBTSxHQUFHLEVBQUUsRUFBRSxRQUFRLEdBQUcsRUFBRSxFQUFFLFNBQVMsR0FBRyxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUM7SUFDdkUsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLE1BQU0sR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNqQyxDQUFDO0lBQUMsSUFBSSxDQUFDLENBQUM7UUFDTixFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDMUIsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMvQyxDQUFDO0lBQ0gsQ0FBQztJQUNELENBQUM7UUFDQyxNQUFNLFNBQVMsR0FBRyxHQUFHLFdBQVcsQ0FBQyxJQUFJLElBQUksZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDN0UsTUFBTSxlQUFlLEdB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