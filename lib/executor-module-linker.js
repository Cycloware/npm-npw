"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("colors");
const Promise = require("bluebird");
const _ = require("lodash");
const ch = require("chalk");
const fs = require("fs-extra-promise");
const pathMod = require("path");
const del = require("del");
const path = pathMod;
const commandBuilder_1 = require("./commandBuilder");
const getStatInfo_1 = require("./getStatInfo");
const thisPackageInfo = require('../package.json');
const thisPackageName = thisPackageInfo.name;
const thisPackageVersion = thisPackageInfo.version;
function compareStringsSensitive(x, y) { return x === y; }
;
function compareStringsInsensitive(x, y) { return x.toLowerCase() === y.toLowerCase(); }
function getStringComparer(caseSensitive) { return caseSensitive ? compareStringsSensitive : compareStringsInsensitive; }
const _consoleLoggerAllLevels = {
    trace(msg) {
        console.info(msg);
    },
    info(msg) {
        console.info(msg);
    },
    warn(msg) {
        console.warn(msg);
    },
    error(msg) {
        console.error(msg);
    }
};
const _nullOp = () => { };
function buildLogger(levels) {
    const ret = Object.assign({}, _consoleLoggerAllLevels);
    for (const prop in ret) {
        if (levels.indexOf(prop) < 0) {
            ret[prop] = _nullOp;
        }
    }
    return ret;
}
exports.GlobalLogger = buildLogger(['info', 'warn', 'error']);
function buildMessages() {
    return {
        messages: buildMessagesCore(),
    };
}
function buildMessagesCore() {
    return {
        items: [],
        trace(msg) {
            this.items.push({ type: 'trace', msg });
        },
        info(msg) {
            this.items.push({ type: 'info', msg });
        },
        warn(msg) {
            this.items.push({ type: 'warn', msg });
        },
        error(msg) {
            this.items.push({ type: 'error', msg });
        },
    };
}
var ChangeDirectory;
(function (ChangeDirectory) {
    function performDirectoryChange(_absoluteOldCurrentDirectory, _absoluteNewCurrentDirectory, _relativeNewCurrentDirectory, log) {
        try {
            const relativeOldWorkingDir = path.relative(_absoluteNewCurrentDirectory, _absoluteOldCurrentDirectory);
            log.trace(` + Changing Current Directory back: ${relativeOldWorkingDir.green} [${_absoluteNewCurrentDirectory.gray}]`);
            process.chdir(_absoluteOldCurrentDirectory);
        }
        catch (err) {
            log.error(` + Error Changing Current Directory back: ${_absoluteOldCurrentDirectory.red} [${_absoluteNewCurrentDirectory.gray}]`);
            throw err;
        }
    }
    function Async(args, action) {
        let directoryWasChanged = false;
        let _absoluteOldCurrentDirectory;
        let _absoluteNewCurrentDirectory;
        let _relativeNewCurrentDirectory;
        let log = exports.GlobalLogger;
        return new Promise((resolve, reject) => {
            const { absoluteNewCurrentDirectory, currentDirectoryOverride = process.cwd(), caseSensitive = true } = args;
            if (args.log) {
                log = args.log;
            }
            const comparer = getStringComparer(caseSensitive);
            const absoluteOldCurrentDirectory = currentDirectoryOverride;
            _absoluteOldCurrentDirectory = absoluteOldCurrentDirectory;
            _absoluteNewCurrentDirectory = absoluteNewCurrentDirectory;
            const directoryShouldChange = !comparer(absoluteNewCurrentDirectory, absoluteOldCurrentDirectory);
            const relativeNewCurrentDirectory = path.relative(absoluteOldCurrentDirectory, absoluteNewCurrentDirectory);
            if (directoryShouldChange) {
                log.trace(` + Changing Current Directory: ${relativeNewCurrentDirectory.green} [${absoluteNewCurrentDirectory.gray}]`);
                process.chdir(absoluteNewCurrentDirectory);
                directoryWasChanged = true;
            }
            const state = {
                currentDirectory: {
                    old: absoluteOldCurrentDirectory,
                    new: absoluteNewCurrentDirectory,
                },
                changed: directoryWasChanged,
                caseSensitive,
                relativeNewCurrentDirectory,
            };
            resolve(action(state));
        }).finally(() => {
            if (directoryWasChanged) {
                performDirectoryChange(_absoluteOldCurrentDirectory, _absoluteNewCurrentDirectory, _relativeNewCurrentDirectory, log);
            }
        });
    }
    ChangeDirectory.Async = Async;
})(ChangeDirectory = exports.ChangeDirectory || (exports.ChangeDirectory = {}));
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
    {
        const titleLine = `${'Cycloware'.blue} ${'Module Linker'.green.bold.italic}`;
        const titleLineLength = ch.stripColor(titleLine).length;
        exports.GlobalLogger.info(`${titleLine}    
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
        exports.GlobalLogger = buildLogger(['warn', 'error']);
    })
        .command(['--verbose'], () => {
        exports.GlobalLogger = buildLogger(['trace', 'info', 'warn', 'error']);
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
        exports.GlobalLogger.trace(` + File paths: ${pathLib.blue}`);
    }
    else if (pathMod.posix === path) {
        pathLib = 'POSIX';
        pathI = pathMod.posix;
        exports.GlobalLogger.trace(` + File paths: ${pathLib.blue}`);
    }
    else {
        exports.GlobalLogger.trace(` + File paths: ${pathLib.red}`);
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
    const compareStrings = getStringComparer(caseSensitive);
    exports.GlobalLogger.trace(` + Case-Sensitive Paths: ${caseSensitive ? 'true'.red : 'false'.blue}`);
    const absolutePackagePath = path.resolve(absoluteBaseDir, packageFilename);
    function getPackageInfo(packagePath) {
        try {
            return { success: true, packageInfo: fs.readJSONSync(packagePath) };
        }
        catch (err) {
            return { success: false, err, message: `Error loading package.json '${packagePath.gray}'; err: ${ch.gray(err)}` };
        }
    }
    const packageResult = getPackageInfo(absolutePackagePath);
    if (packageResult.success === false) {
        exports.GlobalLogger.error(packageResult.message);
        return Promise.reject(packageResult.message);
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
        exports.GlobalLogger.error(mes);
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
                return Promise.reject(msg.strip);
            }
        }
    }
    const absoluteModuleDir = path.resolve(absoluteBaseDir, moduleTarget);
    const relativeModuleDir = path.relative(absoluteBaseDir, absoluteModuleDir);
    const currentDirectory = process.cwd();
    exports.GlobalLogger.trace(` + moduleTarget: ${moduleTarget.blue}`);
    exports.GlobalLogger.trace(` + absoluteBaseDir: ${absoluteBaseDir.blue}`);
    exports.GlobalLogger.trace(` + absoluteModuleDir: ${absoluteModuleDir.blue}`);
    exports.GlobalLogger.trace(` + currentDirectory: ${currentDirectory.blue}`);
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
        exports.GlobalLogger.warn(` + ${'BAD SymlinkPackagesToRemap'.red} ${`package paths must start with '${filePrefix.green}'`}: ${_.values(badSymlinkPackagesToRemap).map(x => `${x.fullPackageName.gray}: ${x.rawValue.yellow}`).join('; ')}`);
    }
    const symlinkPackagesToRemapKeys = Object.keys(symlinkPackagesToRemap);
    if (symlinkPackagesToRemapKeys.length > 0) {
        exports.GlobalLogger.trace(ch.gray(`${' + symlinkPackagesToRemap'.white} [${ch.white(symlinkPackagesToRemapKeys.length)}]: ${_.values(symlinkPackagesToRemap).map(x => `${x.fullPackageName.yellow} [${x.rawValue.white}]`).join(', ')}`));
    }
    else {
        exports.GlobalLogger.warn(` + No ${'symlinkPackagesToRemap'.yellow} to map.`);
        return Promise.resolve(0);
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
        const messages = buildMessagesCore();
        const core = { install, messages, };
        const { absolutePackageInstallPath, relativePackageInstallPath, dependantPackages, name, type } = install;
        messages.info(ch.gray(`${'Ensure Exists'.white}: ${relativePackageInstallPath.yellow} [${type}]`));
        messages.trace(ch.gray(` -- absolutePackageInstallPath: [${absolutePackageInstallPath.gray}] allowLinksInPackageInstallPath: [${allowLinksInPackageInstallPath ? 'true'.red : 'false'.yellow}] DependantPackages: ${dependantPackages}`));
        return getStatInfo_1.getStatInfo.Async(absolutePackageInstallPath, allowLinksInPackageInstallPath).then(stats => {
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
                messages.trace(ch.gray(` -- ${'creating directory'.blue}: ${relativePackageInstallPath.yellow}`));
                return fs.mkdirAsync(absolutePackageInstallPath).then(() => {
                    messages.trace(ch.gray(` -- ${'created directory'.green}: ${relativePackageInstallPath.yellow}`));
                    return Object.assign({ status: 'create' }, core);
                }).catch(err => {
                    const ret = Object.assign({ status: 'error', errorMessage: ch.gray(` -- ${'error creating directory'.red}: ${relativePackageInstallPath.yellow}; err: ${ch.gray(err)}; DependantPackages: ${dependantPackages.toString().gray}`) }, core);
                    return ret;
                });
            }
            else {
                const ret = Object.assign({ status: 'error', errorMessage: `${'Other error while trying to make install path for: '.red} ${name.yellow}; err: ${ch.gray(stats.errorObject)}; DependantPackages: ${dependantPackages.toString().gray}` }, core);
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
                        exports.GlobalLogger[item.type](item.msg);
                    }
                }
            }
            if (errorMessage) {
                exports.GlobalLogger.error(errorMessage);
            }
        }
    }
    return ensureInstallPathPresent(moduleDirInstallInfo).then(res => {
        printMessages(res);
        if (res.status === 'error') {
            return Promise.reject(res.errorMessage);
        }
        if (ensureInstallPathsPresent.length > 0) {
            return Promise.all(ensureInstallPathsPresent.map(x => ensureInstallPathPresent(x))).then(res => {
                res.forEach(p => printMessages(p));
                const errorInstallPaths = res.filter(p => p.status === 'error');
                if (errorInstallPaths.length > 0) {
                    return Promise.reject(`Package Install Paths failed for:
  ${errorInstallPaths.map(p => p.errorMessage).join('  \n')}`);
                }
                return res;
            });
        }
        return res;
    }).then(res => {
        exports.GlobalLogger.info('');
        return ChangeDirectory.Async({
            absoluteNewCurrentDirectory: absoluteModuleDir
        }, (state) => {
            try {
                const _controlFileOptionsPrototype = {
                    package: thisPackageName,
                    version: thisPackageVersion,
                    caseSensitive,
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
                    relativeModuleDir,
                    moduleTarget,
                    moduleTargetSource,
                    controlFilename,
                    absoluteControlFilePath: '',
                    absolutePackagePath,
                    packageFilename,
                    rebuild,
                    mappedPackagesCount: 0,
                    mappedPackages,
                    symlinkPackagesToRemapCount: symlinkPackagesToRemapKeys.length,
                    symlinkPackagesToRemap,
                    badSymlinkPackagesToRemapCount: badSymlinkPackagesToRemapKeys.length,
                    badSymlinkPackagesToRemap,
                };
                const absoluteControlFilePath = path.resolve(absoluteModuleDir, controlFilename);
                let currentControlFileOptions;
                try {
                    if (fs.existsSync(absoluteControlFilePath)) {
                        currentControlFileOptions = fs.readJsonSync(absoluteControlFilePath);
                    }
                }
                catch (err) {
                    if (err.code !== 'ENOENT') {
                        exports.GlobalLogger.warn(` + ${'FAILED:  '.red} to open control file '${controlFilename.yellow}' at '${absoluteModuleDir.gray}.  Err: ${ch.gray(err)}`);
                    }
                }
                function linkModuleAsync(info) {
                    const { packageName, fullPackageName, absoluteLinkToSourcePath, relativeLinkToSourcePath, packageInstallHardFolderPath, absolutePackageInstallPath, absoluteSourcePath, absolutePackageDestinationPath, relativeSourcePath } = info;
                    const messages = buildMessagesCore();
                    const core = Object.assign({}, info, { messages });
                    messages.info(ch.white(`${'Symlink'.white}:  ${fullPackageName.yellow} -> ${relativeSourcePath.clean.gray}`));
                    // messages.trace(ch.gray(` -- absolutePackageInstallPath: [${absolutePackageInstallPath.gray}] allowLinksInPackageInstallPath: [${allowLinksInPackageInstallPath ? 'true'.red : 'false'.yellow}] DependantPackages: ${dependantPackages}`))
                    return getStatInfo_1.getStatInfo.Async(absolutePackageDestinationPath.clean, true).then(stats => {
                        function createSymLink(operationStatus, operationDescription) {
                            messages.info(ch.gray(` -- ${'linking'.green} ${fullPackageName.yellow} with '${operationDescription}' as '${linkType.blue}' from '${relativeSourcePath.clean.green}' [${absoluteSourcePath.clean.gray}] to '${path.resolve(moduleTarget, fullPackageName).green}' [${absolutePackageDestinationPath.clean.gray}]`));
                            return fs.symlinkAsync(relativeLinkToSourcePath.clean, absolutePackageDestinationPath.clean, linkType)
                                .then(() => {
                                messages.info(ch.gray(` -- ${'LINKED'.green}'`));
                                const ret = Object.assign({ status: operationStatus }, core);
                                return ret;
                            })
                                .catch(err => {
                                const ret = Object.assign({ status: 'error', statusSub: 'creating-symlink', errorMessage: `${' -- Error creating symlink: '.red} with '${operationDescription}' as '${linkType.blue}' from '${relativeSourcePath.clean.green} [${absoluteSourcePath.clean.gray}]; Err: ${ch.gray(err)}` }, core);
                                return ret;
                            });
                        }
                        if (stats.result === 'stat-returned') {
                            if (stats.isSymbolicLink) {
                                messages.trace(ch.gray(` -- install path ${'already a symlink'.blue}:  ${'will check target'.yellow}: expectedTarget: [${relativeLinkToSourcePath.clean.white}]`));
                                return fs.readlinkAsync(absolutePackageDestinationPath.clean)
                                    .then(res => cleanPathObj(res))
                                    .then(existingLinkTarget => {
                                    const existingAbsoluteLinkTarget = cleanPathObj(path.resolve(absolutePackageInstallPath, existingLinkTarget.clean));
                                    const existingMatch = compareStrings(existingLinkTarget.clean, relativeLinkToSourcePath.clean);
                                    let existingDiffersByCase = undefined;
                                    if (!existingMatch && caseSensitive) {
                                        existingDiffersByCase = compareStringsInsensitive(existingLinkTarget.clean, relativeLinkToSourcePath.clean);
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
                                        return Promise.resolve(del(absolutePackageDestinationPath.clean))
                                            .then(() => createSymLink('mapped-recreate', 'recreate'.red))
                                            .catch(err => {
                                            const ret = Object.assign({ status: 'error', statusSub: 'remove-existing-symlink', errorMessage: ` -- ${'Error removing existing symlink for: '.red} ${fullPackageName.yellow} [${absolutePackageDestinationPath.clean.gray}]; Err: ${ch.gray(err)}` }, core);
                                            return ret;
                                        });
                                    }
                                })
                                    .catch(err => {
                                    const ret = Object.assign({ status: 'error', statusSub: 'read-existing-symlink', errorMessage: ` -- ${'Error readlinkAsync for: '.red} ${fullPackageName.yellow} [${absolutePackageDestinationPath.clean.gray}]; Err: ${ch.gray(err)}` }, core);
                                    return ret;
                                });
                            }
                            else {
                                const ret = Object.assign({ status: 'error', statusSub: 'exist-not-symlink', errorMessage: ` -- ${'Target location exists but is not a symlink: '.red} ${fullPackageName.yellow}; Location [${absolutePackageDestinationPath.clean.gray}]; Stat: [${JSON.stringify(stats, null, 1).gray}]` }, core);
                                return ret;
                            }
                        }
                        else if (stats.result === 'not-found') {
                            return createSymLink('mapped-recreate', 'recreate'.red);
                        }
                        else {
                            const ret = Object.assign({ status: 'error', statusSub: 'other', errorMessage: ` -- ${'Other error from getStatInfo: '.red} ${fullPackageName.yellow}; Location [${absolutePackageDestinationPath.clean.gray}]; Err: [${ch.gray(stats.errorObject)}]` }, core);
                            return ret;
                        }
                    })
                        .catch(err => {
                        const ret = Object.assign({ status: 'error', statusSub: 'get-stat-info', errorMessage: ` -- ${'Error getStatInfo for: '.red} ${fullPackageName.yellow} [${absolutePackageDestinationPath.clean.gray}]; Err: ${ch.gray(err)}` }, core);
                        return ret;
                    });
                }
                const promisesToMap = _.values(symlinkPackagesToRemap).map(val => linkModuleAsync(val));
                return Promise.all(promisesToMap).then(res => {
                    res.forEach(p => printMessages(p));
                    exports.GlobalLogger.info('');
                    exports.GlobalLogger.warn(`Installed ${ch.green(symlinkPackagesToRemapKeys.length)} symlinks`);
                    const mappedPackagesKeys = Object.keys(mappedPackages);
                    const newControlFileOptions = {
                        package: thisPackageName,
                        version: thisPackageVersion,
                        caseSensitive,
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
                        relativeModuleDir,
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
                    fs.writeJSONSync(absoluteControlFilePath, newControlFileOptions, { spaces: 2 });
                    const errros = res.filter(p => p.status === 'error');
                    if (errros.length > 0) {
                        return Promise.reject(`linkModules failed for [${errros.length.toString().red}]:
        ${errros.map(p => p.errorMessage).join('  \n')}`);
                    }
                    return Promise.resolve(symlinkPackagesToRemap);
                });
            }
            catch (err) {
                exports.GlobalLogger.error(`${'Error occurred'.red}:  ${err}`);
                throw err;
            }
        });
    });
}
exports.moduleLinker = moduleLinker;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0b3ItbW9kdWxlLWxpbmtlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9leGVjdXRvci1tb2R1bGUtbGlua2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsa0JBQWdCO0FBQ2hCLG9DQUFvQztBQUVwQyw0QkFBNEI7QUFFNUIsNEJBQTZCO0FBSTdCLHVDQUF3QztBQUN4QyxnQ0FBZ0M7QUFDaEMsMkJBQTRCO0FBRTVCLE1BQU0sSUFBSSxHQUF5QixPQUFPLENBQUM7QUFJM0MscURBQWtEO0FBRWxELCtDQUE0QztBQUU1QyxNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUNuRCxNQUFNLGVBQWUsR0FBRyxlQUFlLENBQUMsSUFBYyxDQUFDO0FBQ3ZELE1BQU0sa0JBQWtCLEdBQUcsZUFBZSxDQUFDLE9BQWlCLENBQUM7QUFFN0QsaUNBQWlDLENBQVMsRUFBRSxDQUFTLElBQUksTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUEsQ0FBQyxDQUFDO0FBQUEsQ0FBQztBQUMxRSxtQ0FBbUMsQ0FBUyxFQUFFLENBQVMsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFFeEcsMkJBQTJCLGFBQXNCLElBQUksTUFBTSxDQUFDLGFBQWEsR0FBRyx1QkFBdUIsR0FBRyx5QkFBeUIsQ0FBQyxDQUFDLENBQUM7QUFjbEksTUFBTSx1QkFBdUIsR0FBRztJQUM5QixLQUFLLENBQUMsR0FBVztRQUNmLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDcEIsQ0FBQztJQUNELElBQUksQ0FBQyxHQUFXO1FBQ2QsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNwQixDQUFDO0lBQ0QsSUFBSSxDQUFDLEdBQVc7UUFDZCxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FB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