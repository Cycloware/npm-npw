"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0b3Itc3ltLWluc3RhbGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9leGVjdXRvci1zeW0taW5zdGFsbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsa0JBQWdCO0FBRWhCLDRCQUE0QjtBQUU1Qiw0QkFBNkI7QUFJN0IsdUNBQXdDO0FBQ3hDLGdDQUFnQztBQUNoQywyQkFBNEI7QUFFNUIsTUFBTSxJQUFJLEdBQXlCLE9BQU8sQ0FBQztBQUkzQyxxREFBa0Q7QUFDbEQsdURBQW9EO0FBRXBELCtDQUE0QztBQUU1QyxxQ0FBa0g7QUFFbEgscURBQWtEO0FBR2xELCtDQUE0QztBQWdEckMsS0FBSyx1QkFBdUIsSUFBMkY7SUFFNUgsSUFBSSxFQUFFLFdBQVcsRUFBRSxNQUFNLEdBQUcsRUFBRSxFQUFFLFFBQVEsR0FBRyxFQUFFLEVBQUUsU0FBUyxHQUFHLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQztJQUN2RSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsTUFBTSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFBQyxJQUFJLENBQUMsQ0FBQztRQUNOLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMxQixNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQy9DLENBQUM7SUFDSCxDQUFDO0lBQ0QsQ0FBQztRQUNDLE1BQU0sU0FBUyxHQUFHLEdBQUcsV0FBVyxDQUFDLElBQUksSUFBSSxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUM3RSxNQUFNLGVBQWUsR0FBRyxFQUFFLENBQUMs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