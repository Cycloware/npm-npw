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
            return { success: true, packageInfo: require(packagePath) };
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
    const sectionOptionsName = 'cw:LinkModules:options';
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
                    const newContorlOptons = {
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
                    fs.writeJSONSync(absoluteControlFilePath, newContorlOptons, { spaces: 2 });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0b3ItbW9kdWxlLWxpbmtlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9leGVjdXRvci1tb2R1bGUtbGlua2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsa0JBQWdCO0FBQ2hCLG9DQUFvQztBQUVwQyw0QkFBNEI7QUFFNUIsNEJBQTZCO0FBSTdCLHVDQUF3QztBQUN4QyxnQ0FBZ0M7QUFDaEMsMkJBQTRCO0FBRTVCLE1BQU0sSUFBSSxHQUF5QixPQUFPLENBQUM7QUFJM0MscURBQWtEO0FBRWxELCtDQUE0QztBQUU1QyxNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUNuRCxNQUFNLGVBQWUsR0FBRyxlQUFlLENBQUMsSUFBYyxDQUFDO0FBQ3ZELE1BQU0sa0JBQWtCLEdBQUcsZUFBZSxDQUFDLE9BQWlCLENBQUM7QUFFN0QsaUNBQWlDLENBQVMsRUFBRSxDQUFTLElBQUksTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUEsQ0FBQyxDQUFDO0FBQUEsQ0FBQztBQUMxRSxtQ0FBbUMsQ0FBUyxFQUFFLENBQVMsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFFeEcsMkJBQTJCLGFBQXNCLElBQUksTUFBTSxDQUFDLGFBQWEsR0FBRyx1QkFBdUIsR0FBRyx5QkFBeUIsQ0FBQyxDQUFDLENBQUM7QUFjbEksTUFBTSx1QkFBdUIsR0FBRztJQUM5QixLQUFLLENBQUMsR0FBVztRQUNmLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDcEIsQ0FBQztJQUNELElBQUksQ0FBQyxHQUFXO1FBQ2QsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNwQixDQUFDO0lBQ0QsSUFBSSxDQUFDLEdBQVc7UUFDZCxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3BCLENBQUM7SUFDRCxLQUFLLENBQUMsR0FBVztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDckIsQ0FBQztDQUNGLENBQUM7QUFFRixNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsQ0FBQztBQUUxQixxQkFBcUIsTUFBaUI7SUFDcEMsTUFBTSxHQUFHLHFCQUFRLHVCQUF1QixDQUFFLENBQUM7SUFDM0MsR0FBRyxDQUFDLENBQUMsTUFBTSxJQUFJLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN2QixFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEMsR0FBRyxDQUFDLElBQWUsQ0FBQyxHQUFHLE9BQU8sQ0FBQztRQUNqQyxDQUFDO0lBQ0gsQ0FBQztJQUNELE1BQU0sQ0FBQyxHQUFHLENBQUM7QUFDYixDQUFDO0FBRVUsUUFBQSxZQUFZLEdBQW1CLFdBQVcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztBQWVqRjtJQUNFLE1BQU0sQ0FBQztRQUNMLFFBQVEsRUFBRSxpQkFBaUIsRUFBRTtLQUM5QixDQUFBO0FBQ0gsQ0FBQztBQUNEO0lBQ0UsTUFBTSxDQUFDO1FBQ0wsS0FBSyxFQUFFLEVBQUU7UUFFVCxLQUFLLENBQUMsR0FBVztZQUNmLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQzFDLENBQUM7UUFDRCxJQUFJLENBQUMsR0FBVztZQUNkLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQ3pDLENBQUM7UUFDRCxJQUFJLENBQUMsR0FBVztZQUNkLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFBO1FBQ3hDLENBQUM7UUFDRCxLQUFLLENBQUMsR0FBVztZQUNmLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFBO1FBQ3pDLENBQUM7S0FDRixDQUFDO0FBQ0osQ0FBQztBQTRCRCxJQUFpQixlQUFlLENBc0UvQjtBQXRFRCxXQUFpQixlQUFlO0lBWTlCLGdDQUFnQyw0QkFBb0MsRUFBRSw0QkFBb0MsRUFBRSw0QkFBb0MsRUFBRSxHQUFtQjtRQUNuSyxJQUFJLENBQUM7WUFDSCxNQUFNLHFCQUFxQixHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsNEJBQTRCLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztZQUN4RyxHQUFHLENBQUMsS0FBSyxDQUFDLHVDQUF1QyxxQkFBcUIsQ0FBQyxLQUFLLEtBQUssNEJBQTRCLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQztZQUN2SCxPQUFPLENBQUMsS0FBSyxDQUFDLDRCQUE0QixDQUFDLENBQUM7UUFDOUMsQ0FBQztRQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDYixHQUFHLENBQUMsS0FBSyxDQUFDLDZDQUE2Qyw0QkFBNEIsQ0FBQyxHQUFHLEtBQUssNEJBQTRCLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQTtZQUNqSSxNQUFNLEdBQUcsQ0FBQztRQUNaLENBQUM7SUFDSCxDQUFDO0lBRUQsZUFBK0IsSUFHOUIsRUFBRSxNQUE0QztRQUU3QyxJQUFJLG1CQUFtQixHQUFHLEtBQUssQ0FBQztRQUNoQyxJQUFJLDRCQUFvQyxDQUFDO1FBQ3pDLElBQUksNEJBQW9DLENBQUM7UUFDekMsSUFBSSw0QkFBb0MsQ0FBQztRQUN6QyxJQUFJLEdBQUcsR0FBRyxvQkFBWSxDQUFDO1FBQ3ZCLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBVSxDQUFDLE9BQU8sRUFBRSxNQUFNO1lBQzFDLE1BQU0sRUFBRSwyQkFBMkIsRUFBRSx3QkFBd0IsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQzNFLGFBQWEsR0FBRyxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUM7WUFFaEMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ2IsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7WUFDakIsQ0FBQztZQUVELE1BQU0sUUFBUSxHQUFHLGlCQUFpQixDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQ2xELE1BQU0sMkJBQTJCLEdBQUcsd0JBQXdCLENBQUM7WUFDN0QsNEJBQTRCLEdBQUcsMkJBQTJCLENBQUM7WUFDM0QsNEJBQTRCLEdBQUcsMkJBQTJCLENBQUM7WUFFM0QsTUFBTSxxQkFBcUIsR0FBRyxDQUFDLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO1lBQ2xHLE1BQU0sMkJBQTJCLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO1lBQzVHLEVBQUUsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQztnQkFDMUIsR0FBRyxDQUFDLEtBQUssQ0FBQyxrQ0FBa0MsMkJBQTJCLENBQUMsS0FBSyxLQUFLLDJCQUEyQixDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7Z0JBQ3ZILE9BQU8sQ0FBQyxLQUFLLENBQUMsMkJBQTJCLENBQUMsQ0FBQztnQkFDM0MsbUJBQW1CLEdBQUcsSUFBSSxDQUFDO1lBQzdCLENBQUM7WUFFRCxNQUFNLEtBQUssR0FBVztnQkFDcEIsZ0JBQWdCLEVBQUU7b0JBQ2hCLEdBQUcsRUFBRSwyQkFBMkI7b0JBQ2hDLEdBQUcsRUFBRSwyQkFBMkI7aUJBQ2pDO2dCQUNELE9BQU8sRUFBRSxtQkFBbUI7Z0JBQzVCLGFBQWE7Z0JBQ2IsMkJBQTJCO2FBQzVCLENBQUE7WUFDRCxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDekIsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1lBQ1QsRUFBRSxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO2dCQUN4QixzQkFBc0IsQ0FBQyw0QkFBNEIsRUFBRSw0QkFBNEIsRUFBRSw0QkFBNEIsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUN4SCxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBOUNlLHFCQUFLLFFBOENwQixDQUFBO0FBQ0gsQ0FBQyxFQXRFZ0IsZUFBZSxHQUFmLHVCQUFlLEtBQWYsdUJBQWUsUUFzRS9CO0FBRUQsc0JBQTZCLElBQTJGO0lBRXRILElBQUksRUFBRSxXQUFXLEVBQUUsTUFBTSxHQUFHLEVBQUUsRUFBRSxRQUFRLEdBQUcsRUFBRSxFQUFFLFNBQVMsR0FBRyxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUM7SUFDdkUsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLE1BQU0sR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNqQyxDQUFDO0lBQUMsSUFBSSxDQUFDLENBQUM7UUFDTixFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDMUIsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMvQyxDQUFDO0lBQ0gsQ0FBQztJQUNELENBQUM7UUFDQyxNQUFNLFNBQVMsR0FBRyxHQUFHLFdBQVcsQ0FBQyxJQUFJLElBQUksZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDN0UsTUFBTSxlQUFlLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFDeEQsb0JBQVksQ0FBQyxJQUFJLENBQ2YsR0FBRyxTQUFTO0VBQ2hCLEdBQUcsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsS0FBSztDQUNsQyxDQUFDLENBQUE7SUFDQSxDQUFDO0lBQ0QsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQzlCLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7SUFFOUMsSUFBSSxlQUFlLEdBQUcsa0JBQWtCLENBQUE7SUFDeEMsSUFBSSxZQUFZLEdBQUcsY0FBYyxDQUFDO0lBQ2xDLElBQUksa0JBQWtCLEdBQUcsU0FBUyxDQUFDO0lBQ25DLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQztJQUNwQixJQUFJLDhCQUE4QixHQUFHLEtBQUssQ0FBQztJQUMzQyxJQUFJLGFBQWEsR0FBRyxLQUFLLENBQUM7SUFFMUIsTUFBTSxlQUFlLEdBQUcsY0FBYyxDQUFDO0lBRXZDLE1BQU0sUUFBUSxHQUFHLCtCQUFjLENBQUMsS0FBSyxFQUFFO1NBQ3BDLE9BQU8sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUNyQixDQUFDLEtBQUs7UUFDSixZQUFZLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLGtCQUFrQixHQUFHLFNBQVMsQ0FBQztJQUNqQyxDQUFDLEVBQUU7UUFDRCxLQUFLLEVBQUUsQ0FBQztLQUNULENBQUM7U0FDRCxPQUFPLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFBRTtRQUN0QixPQUFPLEdBQUcsSUFBSSxDQUFDO0lBQ2pCLENBQUMsQ0FBQztTQUNELE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFO1FBQ3BCLG9CQUFZLEdBQUcsV0FBVyxDQUFDLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUE7SUFDL0MsQ0FBQyxDQUFDO1NBQ0QsT0FBTyxDQUFDLENBQUMsV0FBVyxDQUFDLEVBQUU7UUFDdEIsb0JBQVksR0FBRyxXQUFXLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFBO0lBQ2hFLENBQUMsQ0FBQztTQUNELE9BQU8sQ0FBQyxDQUFDLGVBQWUsQ0FBQyxFQUFFO1FBQzFCLGFBQWEsR0FBRyxLQUFLLENBQUM7SUFDeEIsQ0FBQyxDQUFDLENBQUE7SUFDSixNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3hELE1BQU0sRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsY0FBYyxFQUFFLGdCQUFnQixFQUFFLG9CQUFvQixFQUFFLEVBQUUsR0FBRyxjQUFjLENBQUM7SUFFNUksSUFBSSxPQUFPLEdBQUcsU0FBUyxDQUFDO0lBQ3hCLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQztJQUNqQixJQUFJLGdCQUFnQixHQUFHLElBQUksQ0FBQztJQUM1QixJQUFJLGlCQUFpQixHQUFHLEdBQUcsQ0FBQztJQUM1QixJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUM7SUFDckIsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzNCLE9BQU8sR0FBRyxPQUFPLENBQUM7UUFDbEIsS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUM7UUFFdEIsTUFBTSxDQUFDLEdBQUcsZ0JBQWdCLENBQUM7UUFDM0IsZ0JBQWdCLEdBQUcsaUJBQWlCLENBQUM7UUFDckMsaUJBQWlCLEdBQUcsQ0FBQyxDQUFDO1FBRXRCLG9CQUFZLENBQUMsS0FBSyxDQUFDLGtCQUFrQixPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNsQyxPQUFPLEdBQUcsT0FBTyxDQUFDO1FBQ2xCLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDO1FBQ3RCLG9CQUFZLENBQUMsS0FBSyxDQUFDLGtCQUFrQixPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBQUMsSUFBSSxDQUFDLENBQUM7UUFDTixvQkFBWSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDdEQsQ0FBQztJQUVELG1CQUFtQixNQUFjO1FBQy9CLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDaEUsQ0FBQztJQUNELHNCQUFzQixNQUFjO1FBQ2xDLE1BQU0sQ0FBQztZQUNMLEdBQUcsRUFBRSxNQUFNO1lBQ1gsS0FBSyxFQUFFLFNBQVMsQ0FBQyxNQUFNLENBQUM7U0FDekIsQ0FBQTtJQUNILENBQUM7SUFFRCxNQUFNLGNBQWMsR0FBRyxpQkFBaUIsQ0FBQyxhQUFhLENBQUMsQ0FBQTtJQUN2RCxvQkFBWSxDQUFDLEtBQUssQ0FBQyw0QkFBNEIsYUFBYSxHQUFHLE1BQU0sQ0FBQyxHQUFHLEdBQUcsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7SUFFM0YsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsRUFBRSxlQUFlLENBQUMsQ0FBQztJQUUzRSx3QkFBd0IsV0FBbUI7UUFDekMsSUFBSSxDQUFDO1lBQ0gsTUFBTSxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7UUFDOUQsQ0FBQztRQUNELEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDWCxNQUFNLENBQUMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsK0JBQStCLFdBQVcsQ0FBQyxJQUFJLFdBQVcsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUE7UUFDbkgsQ0FBQztJQUNILENBQUM7SUFFRCxNQUFNLGFBQWEsR0FBRyxjQUFjLENBQUMsbUJBQW1CLENBQUMsQ0FBQztJQUMxRCxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsT0FBTyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDcEMsb0JBQVksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3pDLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBRUQsTUFBTSxzQkFBc0IsR0FBZ0MsRUFBRSxDQUFDO0lBQy9ELE1BQU0seUJBQXlCLEdBQXNDLEVBQUUsQ0FBQztJQUN4RSxNQUFNLGNBQWMsR0FBc0MsRUFBRSxDQUFDO0lBRTdELE1BQU0sV0FBVyxHQUFHLGdCQUFnQixDQUFDO0lBQ3JDLE1BQU0sa0JBQWtCLEdBQUcsd0JBQXdCLENBQUE7SUFDbkQsTUFBTSxFQUFFLFdBQVcsRUFBRSxHQUFHLGFBQWEsQ0FBQztJQUN0QyxNQUFNLGlCQUFpQixHQUFHLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNuRCxFQUFFLENBQUMsQ0FBQyxPQUFPLGlCQUFpQixLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDMUMsTUFBTSxHQUFHLEdBQUcsZUFBZSxXQUFXLENBQUMsTUFBTSxtQkFBbUIsQ0FBQztRQUNqRSxvQkFBWSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN4QixNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBRUQsTUFBTSxpQkFBaUIsR0FBRyxXQUFXLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUMxRCxFQUFFLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7UUFDdEIsRUFBRSxDQUFDLENBQUMsa0JBQWtCLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQztZQUNyQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsaUJBQWlCLENBQUM7WUFDeEMsRUFBRSxDQUFDLENBQUMsT0FBTyxTQUFTLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQztnQkFDbEMsWUFBWSxHQUFHLFNBQVMsQ0FBQztnQkFDekIsa0JBQWtCLEdBQUcsUUFBUSxDQUFDO1lBQ2hDLENBQUM7UUFDSCxDQUFDO0lBQ0gsQ0FBQztJQUNELE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDdEUsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0lBQzVFLE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQ3ZDLG9CQUFZLENBQUMsS0FBSyxDQUFDLG9CQUFvQixZQUFZLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQTtJQUMzRCxvQkFBWSxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsZUFBZSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7SUFDbEUsb0JBQVksQ0FBQyxLQUFLLENBQUMseUJBQXlCLGlCQUFpQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7SUFDdEUsb0JBQVksQ0FBQyxLQUFLLENBQUMsd0JBQXdCLGdCQUFnQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7SUFFcEUsZ0hBQWdIO0lBQ2hILHdGQUF3RjtJQUV4RixNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUM7SUFDM0IsR0FBRyxDQUFDLENBQUMsTUFBTSxlQUFlLElBQUksaUJBQWlCLENBQUMsQ0FBQyxDQUFDO1FBQ2hELE1BQU0sS0FBSyxHQUFHLGlCQUFpQixDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ2pELEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2pDLE1BQU0sa0JBQWtCLEdBQUcsWUFBWSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDeEUsTUFBTSxrQkFBa0IsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUUsa0JBQWtCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUUvRixNQUFNLGdCQUFnQixHQUFHLGVBQWUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDcEQsSUFBSSxXQUFXLEdBQUcsZUFBZSxDQUFDO1lBRWxDLElBQUksK0JBQStCLEdBQUcsZ0JBQWdCLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztZQUNsRSxJQUFJLDBCQUEwQixHQUFHLGlCQUFpQixDQUFDO1lBQ25ELElBQUksNEJBQTRCLEdBQUcsRUFBRSxDQUFDO1lBQ3RDLEVBQUUsQ0FBQyxDQUFDLCtCQUErQixDQUFDLENBQUMsQ0FBQztnQkFDcEMsNEJBQTRCLEdBQUcsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxnQkFBZ0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNoRyxXQUFXLEdBQUcsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUU1RCwwQkFBMEIsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLDBCQUEwQixFQUFFLDRCQUE0QixDQUFDLENBQUM7WUFDdEcsQ0FBQztZQUVELE1BQU0sMEJBQTBCLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztZQUM5RixNQUFNLDJCQUEyQixHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDO1lBQzNGLE1BQU0sOEJBQThCLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsMEJBQTBCLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUMzRyxNQUFNLHdCQUF3QixHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLDBCQUEwQixFQUFFLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFFakgsc0JBQXNCLENBQUMsV0FBVyxDQUFDLEdBQUc7Z0JBQ3BDLGVBQWU7Z0JBQ2YsV0FBVztnQkFDWCwyQkFBMkI7Z0JBQzNCLFFBQVEsRUFBRSxLQUFLO2dCQUNmLGtCQUFrQjtnQkFDbEIsa0JBQWtCO2dCQUNsQixnQkFBZ0I7Z0JBQ2hCLCtCQUErQjtnQkFDL0IsNEJBQTRCO2dCQUM1QiwwQkFBMEI7Z0JBQzFCLDBCQUEwQjtnQkFDMUIsUUFBUTtnQkFDUix3QkFBd0I7Z0JBQ3hCLHdCQUF3QixFQUFFLGtCQUFrQjtnQkFDNUMsOEJBQThCO2FBQy9CLENBQUE7UUFDSCxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDTix5QkFBeUIsQ0FBQyxlQUFlLENBQUMsR0FBRztnQkFDM0MsZUFBZTtnQkFDZixRQUFRLEVBQUUsS0FBSzthQUNoQixDQUFBO1FBQ0gsQ0FBQztJQUNILENBQUM7SUFFRCxNQUFNLDZCQUE2QixHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM3RSxFQUFFLENBQUMsQ0FBQyw2QkFBNkIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3QyxvQkFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLDRCQUE0QixDQUFDLEdBQUcsSUFBSSxrQ0FBa0MsVUFBVSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMseUJBQXlCLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDdE8sQ0FBQztJQUVELE1BQU0sMEJBQTBCLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0lBQ3ZFLEVBQUUsQ0FBQyxDQUFDLDBCQUEwQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzFDLG9CQUFZLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRywyQkFBMkIsQ0FBQyxLQUFLLEtBQUssRUFBRSxDQUFDLEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLHNCQUFzQixDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxlQUFlLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDck8sQ0FBQztJQUNELElBQUksQ0FBQyxDQUFDO1FBQ0osb0JBQVksQ0FBQyxJQUFJLENBQUMsU0FBUyx3QkFBd0IsQ0FBQyxNQUFNLFVBQVUsQ0FBQyxDQUFDO1FBQ3RFLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzVCLENBQUM7SUFDRCxNQUFNLGlDQUFpQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO0lBQzFILE1BQU0saUNBQWlDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxpQ0FBaUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLDRCQUE0QixDQUFDLENBQUM7SUFVNUgsTUFBTSxvQkFBb0IsR0FBRyxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLHVCQUF1QixFQUFFLDBCQUEwQixFQUFFLGlCQUFpQixFQUFFLDBCQUEwQixFQUFFLGlCQUFpQixFQUFFLGlCQUFpQixFQUFFLDBCQUEwQixFQUFFLENBQUM7SUFFaE8sTUFBTSx5QkFBeUIsR0FDN0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxpQ0FBaUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHO1FBQ2hELE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsQixNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDO1lBQ0wsSUFBSSxFQUFFLEdBQUcsQ0FBQyxNQUFNO1lBQ2hCLElBQUksRUFBRSxzQkFBc0I7WUFDNUIsMEJBQTBCLEVBQUUsRUFBRSxDQUFDLDBCQUEwQjtZQUN6RCwwQkFBMEIsRUFBRSxFQUFFLENBQUMsMEJBQTBCO1lBQ3pELGlCQUFpQixFQUFFLFFBQVE7U0FDNUIsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFDO0lBWUwsa0NBQWtDLE9BQTRCO1FBRTVELE1BQU0sUUFBUSxHQUFHLGlCQUFpQixFQUFFLENBQUM7UUFDckMsTUFBTSxJQUFJLEdBQXFCLEVBQUUsT0FBTyxFQUFFLFFBQVEsR0FBRyxDQUFBO1FBRXJELE1BQU0sRUFBRSwwQkFBMEIsRUFBRSwwQkFBMEIsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEdBQUcsT0FBTyxDQUFDO1FBQzFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLGVBQWUsQ0FBQyxLQUFLLEtBQUssMEJBQTBCLENBQUMsTUFBTSxLQUFLLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNuRyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsb0NBQW9DLDBCQUEwQixDQUFDLElBQUksc0NBQXNDLDhCQUE4QixHQUFHLE1BQU0sQ0FBQyxHQUFHLEdBQUcsT0FBTyxDQUFDLE1BQU0sd0JBQXdCLGlCQUFpQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3pPLE1BQU0sQ0FBQyx5QkFBVyxDQUFDLEtBQUssQ0FBQywwQkFBMEIsRUFBRSw4QkFBOEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLO1lBQzdGLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEtBQUssZUFBZSxDQUFDLENBQUMsQ0FBQztnQkFDckMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sZ0JBQWdCLENBQUMsS0FBSyxLQUFLLDBCQUEwQixDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDOUYsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7b0JBQ3RCLE1BQU0sR0FBRyxtQkFDUCxNQUFNLEVBQUUsUUFBUSxJQUNiLElBQUksQ0FDUixDQUFBO29CQUNELE1BQU0sQ0FBQyxHQUFHLENBQUM7Z0JBQ2IsQ0FBQztnQkFDRCxJQUFJLENBQUMsQ0FBQztvQkFDSixNQUFNLEdBQUcsbUJBQ1AsTUFBTSxFQUFFLE9BQU8sRUFDZixZQUFZLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLDJCQUEyQiwwQkFBMEIsQ0FBQyxNQUFNLGdDQUFnQyxZQUFZLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLGlDQUFpQywwQkFBMEIsQ0FBQyxLQUFLLHdCQUF3QixpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUNsUyxJQUFJLENBQ1IsQ0FBQztvQkFDRixNQUFNLENBQUMsR0FBRyxDQUFDO2dCQUNiLENBQUM7WUFDSCxDQUFDO1lBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEtBQUssV0FBVyxDQUFDLENBQUMsQ0FBQztnQkFDeEMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sb0JBQW9CLENBQUMsSUFBSSxLQUFLLDBCQUEwQixDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDakcsTUFBTSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxJQUFJLENBQUM7b0JBQ3BELFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLG1CQUFtQixDQUFDLEtBQUssS0FBSywwQkFBMEIsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7b0JBQ2pHLE1BQU0sQ0FBQyxnQkFDTCxNQUFNLEVBQUUsUUFBUSxJQUNiLElBQUksQ0FDWSxDQUFDO2dCQUN4QixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRztvQkFDVixNQUFNLEdBQUcsbUJBQ1AsTUFBTSxFQUFFLE9BQU8sRUFDZixZQUFZLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLDBCQUEwQixDQUFDLEdBQUcsS0FBSywwQkFBMEIsQ0FBQyxNQUFNLFVBQVUsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsd0JBQXdCLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLElBQ2hMLElBQUksQ0FDUixDQUFDO29CQUNGLE1BQU0sQ0FBQyxHQUFHLENBQUM7Z0JBQ2IsQ0FBQyxDQUFDLENBQUE7WUFDSixDQUFDO1lBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ04sTUFBTSxHQUFHLG1CQUNQLE1BQU0sRUFBRSxPQUFPLEVBQ2YsWUFBWSxFQUFFLEdBQUcscURBQXFELENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxNQUFNLFVBQVUsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLHdCQUF3QixpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFDckwsSUFBSSxDQUNSLENBQUM7Z0JBQ0YsTUFBTSxDQUFDLEdBQUcsQ0FBQztZQUNiLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQTtJQUNKLENBQUM7SUFFRCx1QkFBdUIsS0FBaUM7UUFDdEQsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNWLE1BQU0sRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLEdBQUcsS0FBSyxDQUFDO1lBQ3pDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7Z0JBQ2IsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLFFBQVEsQ0FBQztnQkFDM0IsRUFBRSxDQUFDLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDOUIsR0FBRyxDQUFDLENBQUMsTUFBTSxJQUFJLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQzt3QkFDekIsb0JBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNwQyxDQUFDO2dCQUNILENBQUM7WUFDSCxDQUFDO1lBQ0QsRUFBRSxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztnQkFDakIsb0JBQVksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDbkMsQ0FBQztRQUNILENBQUM7SUFDSCxDQUFDO0lBRUQsTUFBTSxDQUFDLHdCQUF3QixDQUFDLG9CQUFvQixDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUc7UUFDNUQsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ25CLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQztZQUMzQixNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDekMsQ0FBQztRQUVELEVBQUUsQ0FBQyxDQUFDLHlCQUF5QixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3pDLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksd0JBQXdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHO2dCQUMxRixHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDbkMsTUFBTSxpQkFBaUIsR0FBd0IsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQVEsQ0FBQztnQkFDNUYsRUFBRSxDQUFDLENBQUMsaUJBQWlCLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ2pDLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO0lBQzVCLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUE7Z0JBQ3RELENBQUM7Z0JBQ0QsTUFBTSxDQUFDLEdBQUcsQ0FBQztZQUNiLENBQUMsQ0FBQyxDQUFBO1FBQ0osQ0FBQztRQUNELE1BQU0sQ0FBQyxHQUFHLENBQUM7SUFDYixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRztRQUVULG9CQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRXRCLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDO1lBQzNCLDJCQUEyQixFQUFFLGlCQUFpQjtTQUMvQyxFQUFFLENBQUMsS0FBSztZQUNQLElBQUksQ0FBQztnQkFFSCxNQUFNLHVCQUF1QixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsaUJBQWlCLEVBQUUsZUFBZSxDQUFDLENBQUM7Z0JBQ2pGLElBQUkseUJBQThCLENBQUM7Z0JBQ25DLElBQUksQ0FBQztvQkFDSCxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUMzQyx5QkFBeUIsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLHVCQUF1QixDQUFDLENBQUM7b0JBQ3ZFLENBQUM7Z0JBQ0gsQ0FBQztnQkFBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUNiLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQzt3QkFDMUIsb0JBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxXQUFXLENBQUMsR0FBRywwQkFBMEIsZUFBZSxDQUFDLE1BQU0sU0FBUyxpQkFBaUIsQ0FBQyxJQUFJLFdBQVcsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ25KLENBQUM7Z0JBQ0gsQ0FBQztnQkFFRCx5QkFBeUIsSUFBcUI7b0JBQzVDLE1BQU0sRUFBRSxXQUFXLEVBQUUsZUFBZSxFQUFFLHdCQUF3QixFQUFFLHdCQUF3QixFQUN0Riw0QkFBNEIsRUFBRSwwQkFBMEIsRUFBRSxrQkFBa0IsRUFDNUUsOEJBQThCLEVBQUUsa0JBQWtCLEVBQUUsR0FBRyxJQUFJLENBQUM7b0JBRTlELE1BQU0sUUFBUSxHQUFHLGlCQUFpQixFQUFFLENBQUM7b0JBQ3JDLE1BQU0sSUFBSSxxQkFBNEIsSUFBSSxJQUFFLFFBQVEsR0FBRyxDQUFBO29CQUV2RCxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxTQUFTLENBQUMsS0FBSyxNQUFNLGVBQWUsQ0FBQyxNQUFNLE9BQU8sa0JBQWtCLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDOUcsNE9BQTRPO29CQUM1TyxNQUFNLENBQUMseUJBQVcsQ0FBQyxLQUFLLENBQUMsOEJBQThCLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLO3dCQUU3RSx1QkFBdUIsZUFBbUQsRUFBRSxvQkFBNEI7NEJBQ3RHLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLFNBQVMsQ0FBQyxLQUFLLElBQUksZUFBZSxDQUFDLE1BQU0sVUFBVSxvQkFBb0IsU0FBUyxRQUFRLENBQUMsSUFBSSxXQUFXLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxLQUFLLE1BQU0sa0JBQWtCLENBQUMsS0FBSyxDQUFDLElBQUksU0FBUyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxlQUFlLENBQUMsQ0FBQyxLQUFLLE1BQU0sOEJBQThCLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQTs0QkFFcFQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsd0JBQXdCLENBQUMsS0FBSyxFQUFFLDhCQUE4QixDQUFDLEtBQUssRUFBRSxRQUFRLENBQUM7aUNBQ25HLElBQUksQ0FBQztnQ0FDSixRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxRQUFRLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dDQUNqRCxNQUFNLEdBQUcsbUJBQ1AsTUFBTSxFQUFFLGVBQWUsSUFDcEIsSUFBSSxDQUNSLENBQUM7Z0NBQ0YsTUFBTSxDQUFDLEdBQUcsQ0FBQzs0QkFDYixDQUFDLENBQUM7aUNBQ0QsS0FBSyxDQUFDLEdBQUc7Z0NBQ1IsTUFBTSxHQUFHLG1CQUNQLE1BQU0sRUFBRSxPQUFPLEVBQ2YsU0FBUyxFQUFFLGtCQUFrQixFQUM3QixZQUFZLEVBQUUsR0FBRyw4QkFBOEIsQ0FBQyxHQUFHLFVBQVUsb0JBQW9CLFNBQVMsUUFBUSxDQUFDLElBQUksV0FBVyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsS0FBSyxLQUFLLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxJQUFJLFdBQVcsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUN4TSxJQUFJLENBQ1IsQ0FBQztnQ0FDRixNQUFNLENBQUMsR0FBRyxDQUFDOzRCQUNiLENBQUMsQ0FBQyxDQUFDO3dCQUNQLENBQUM7d0JBRUQsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sS0FBSyxlQUFlLENBQUMsQ0FBQyxDQUFDOzRCQUNyQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztnQ0FDekIsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLG9CQUFvQixtQkFBbUIsQ0FBQyxJQUFJLE1BQU0sbUJBQW1CLENBQUMsTUFBTSxzQkFBc0Isd0JBQXdCLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztnQ0FDbkssTUFBTSxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsOEJBQThCLENBQUMsS0FBSyxDQUFDO3FDQUMxRCxJQUFJLENBQUMsR0FBRyxJQUFJLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztxQ0FDOUIsSUFBSSxDQUFDLGtCQUFrQjtvQ0FDdEIsTUFBTSwwQkFBMEIsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQywwQkFBMEIsRUFBRSxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO29DQUNwSCxNQUFNLGFBQWEsR0FBRyxjQUFjLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxDQUFDO29DQUMvRixJQUFJLHFCQUFxQixHQUFZLFNBQVMsQ0FBQztvQ0FDL0MsRUFBRSxDQUFDLENBQUMsQ0FBQyxhQUFhLElBQUksYUFBYSxDQUFDLENBQUMsQ0FBQzt3Q0FDcEMscUJBQXFCLEdBQUcseUJBQXlCLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxDQUFDO29DQUM5RyxDQUFDO29DQUNELElBQUksQ0FBQyxRQUFRLEdBQUc7d0NBQ2QsVUFBVSxFQUFFLGtCQUFrQjt3Q0FDOUIsa0JBQWtCLEVBQUUsMEJBQTBCO3dDQUM5QyxhQUFhO3dDQUNiLGFBQWE7d0NBQ2IscUJBQXFCO3FDQUN0QixDQUFDO29DQUVGLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7d0NBQ2xCLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQzt3Q0FDakUsTUFBTSxHQUFHLG1CQUNQLE1BQU0sRUFBRSxRQUFRLElBQ2IsSUFBSSxDQUNSLENBQUE7d0NBQ0QsTUFBTSxDQUFDLEdBQUcsQ0FBQztvQ0FDYixDQUFDO29DQUFDLElBQUksQ0FBQyxDQUFDO3dDQUNOLEVBQUUsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQzs0Q0FDMUIsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLHNCQUFzQixzQkFBc0IsQ0FBQyxHQUFHLHdCQUF3QixlQUFlLENBQUMsSUFBSSwwQkFBMEIsa0JBQWtCLENBQUMsS0FBSyxDQUFDLE1BQU0sK0JBQStCLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7d0NBQ3RQLENBQUM7d0NBRUQsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLHNCQUFzQixnQkFBZ0IsQ0FBQyxNQUFNLDRDQUE0QyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsS0FBSyxxQkFBcUIsd0JBQXdCLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQzt3Q0FDNU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLDhCQUE4QixDQUFDLEtBQUssQ0FBQyxDQUFDOzZDQUM5RCxJQUFJLENBQUMsTUFBTSxhQUFhLENBQUMsaUJBQWlCLEVBQUUsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDOzZDQUM1RCxLQUFLLENBQUMsR0FBRzs0Q0FDUixNQUFNLEdBQUcsbUJBQ1AsTUFBTSxFQUFFLE9BQU8sRUFDZixTQUFTLEVBQUUseUJBQXlCLEVBQ3BDLFlBQVksRUFBRSxPQUFPLHVDQUF1QyxDQUFDLEdBQUcsSUFBSSxlQUFlLENBQUMsTUFBTSxLQUFLLDhCQUE4QixDQUFDLEtBQUssQ0FBQyxJQUFJLFdBQVcsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUM5SixJQUFJLENBQ1IsQ0FBQzs0Q0FDRixNQUFNLENBQUMsR0FBRyxDQUFDO3dDQUNiLENBQUMsQ0FBQyxDQUFBO29DQUNOLENBQUM7Z0NBQ0gsQ0FBQyxDQUFDO3FDQUNELEtBQUssQ0FBQyxHQUFHO29DQUNSLE1BQU0sR0FBRyxtQkFDUCxNQUFNLEVBQUUsT0FBTyxFQUNmLFNBQVMsRUFBRSx1QkFBdUIsRUFDbEMsWUFBWSxFQUFFLE9BQU8sMkJBQTJCLENBQUMsR0FBRyxJQUFJLGVBQWUsQ0FBQyxNQUFNLEtBQUssOEJBQThCLENBQUMsS0FBSyxDQUFDLElBQUksV0FBVyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQ2xKLElBQUksQ0FDUixDQUFDO29DQUNGLE1BQU0sQ0FBQyxHQUFHLENBQUM7Z0NBQ2IsQ0FBQyxDQUFDLENBQUM7NEJBQ1AsQ0FBQzs0QkFDRCxJQUFJLENBQUMsQ0FBQztnQ0FDSixNQUFNLEdBQUcsbUJBQ1AsTUFBTSxFQUFFLE9BQU8sRUFDZixTQUFTLEVBQUUsbUJBQW1CLEVBQzlCLFlBQVksRUFBRSxPQUFPLCtDQUErQyxDQUFDLEdBQUcsSUFBSSxlQUFlLENBQUMsTUFBTSxlQUFlLDhCQUE4QixDQUFDLEtBQUssQ0FBQyxJQUFJLGFBQWEsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxJQUMxTSxJQUFJLENBQ1IsQ0FBQztnQ0FDRixNQUFNLENBQUMsR0FBRyxDQUFDOzRCQUNiLENBQUM7d0JBQ0gsQ0FBQzt3QkFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sS0FBSyxXQUFXLENBQUMsQ0FBQyxDQUFDOzRCQUN4QyxNQUFNLENBQUMsYUFBYSxDQUFDLGlCQUFpQixFQUFFLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQzt3QkFDMUQsQ0FBQzt3QkFBQyxJQUFJLENBQUMsQ0FBQzs0QkFDTixNQUFNLEdBQUcsbUJBQ1AsTUFBTSxFQUFFLE9BQU8sRUFDZixTQUFTLEVBQUUsT0FBTyxFQUNsQixZQUFZLEVBQUUsT0FBTyxnQ0FBZ0MsQ0FBQyxHQUFHLElBQUksZUFBZSxDQUFDLE1BQU0sZUFBZSw4QkFBOEIsQ0FBQyxLQUFLLENBQUMsSUFBSSxZQUFZLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFHLElBQ2pMLElBQUksQ0FDUixDQUFDOzRCQUNGLE1BQU0sQ0FBQyxHQUFHLENBQUM7d0JBQ2IsQ0FBQztvQkFDSCxDQUFDLENBQUM7eUJBQ0MsS0FBSyxDQUFDLEdBQUc7d0JBQ1IsTUFBTSxHQUFHLG1CQUNQLE1BQU0sRUFBRSxPQUFPLEVBQ2YsU0FBUyxFQUFFLGVBQWUsRUFDMUIsWUFBWSxFQUFFLE9BQU8seUJBQXlCLENBQUMsR0FBRyxJQUFJLGVBQWUsQ0FBQyxNQUFNLEtBQUssOEJBQThCLENBQUMsS0FBSyxDQUFDLElBQUksV0FBVyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQ2hKLElBQUksQ0FDUixDQUFDO3dCQUNGLE1BQU0sQ0FBQyxHQUFHLENBQUM7b0JBQ2IsQ0FBQyxDQUFDLENBQUE7Z0JBQ04sQ0FBQztnQkFFRCxNQUFNLGFBQWEsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLHNCQUFzQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDeEYsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUc7b0JBQ3hDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUVuQyxvQkFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDdEIsb0JBQVksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsS0FBSyxDQUFDLDBCQUEwQixDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztvQkFFdkYsTUFBTSxrQkFBa0IsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO29CQUl2RCxNQUFNLGdCQUFnQixHQUFHO3dCQUN2QixPQUFPLEVBQUUsZUFBZTt3QkFDeEIsT0FBTyxFQUFFLGtCQUFrQjt3QkFFM0IsYUFBYTt3QkFFYixPQUFPO3dCQUNQLGdCQUFnQjt3QkFDaEIsaUJBQWlCO3dCQUNqQixRQUFRO3dCQUVSLGVBQWU7d0JBQ2YsZ0JBQWdCO3dCQUVoQixXQUFXO3dCQUNYLFdBQVcsRUFBRSxpQkFBaUI7d0JBQzlCLGtCQUFrQjt3QkFDbEIsY0FBYyxFQUFFLGlCQUFpQjt3QkFFakMsOEJBQThCO3dCQUU5QixpQkFBaUI7d0JBQ2pCLGlCQUFpQjt3QkFDakIsWUFBWTt3QkFDWixrQkFBa0I7d0JBRWxCLGVBQWU7d0JBQ2YsdUJBQXVCO3dCQUV2QixtQkFBbUI7d0JBQ25CLGVBQWU7d0JBRWYsT0FBTzt3QkFHUCxtQkFBbUIsRUFBRSxrQkFBa0IsQ0FBQyxNQUFNO3dCQUM5QyxjQUFjO3dCQUVkLDJCQUEyQixFQUFFLDBCQUEwQixDQUFDLE1BQU07d0JBQzlELHNCQUFzQjt3QkFFdEIsOEJBQThCLEVBQUUsNkJBQTZCLENBQUMsTUFBTTt3QkFDcEUseUJBQXlCO3FCQUMxQixDQUFBO29CQUVELEVBQUUsQ0FBQyxhQUFhLENBQUMsdUJBQXVCLEVBQUUsZ0JBQWdCLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFFM0UsTUFBTSxNQUFNLEdBQXdCLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFRLENBQUM7b0JBQ2pGLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDdEIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsMkJBQTJCLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsR0FBRztVQUMvRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQTtvQkFDL0MsQ0FBQztvQkFDRCxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO2dCQUNqRCxDQUFDLENBQUMsQ0FBQTtZQUNKLENBQUM7WUFBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUNiLG9CQUFZLENBQUMsS0FBSyxDQUFDLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxNQUFNLEdBQUcsRUFBRSxDQUFDLENBQUM7Z0JBQ3ZELE1BQU0sR0FBRyxDQUFDO1lBQ1osQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFBO0lBQ0osQ0FBQyxDQUFDLENBQUE7QUFFSixDQUFDO0FBL2hCRCxvQ0EraEJDIn0=