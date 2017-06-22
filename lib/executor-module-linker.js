"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("colors");
const Promise = require("bluebird");
const _ = require("lodash");
const chalk = require("chalk");
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
exports.NullLogger = {
    trace(msg) {
        console.info(msg);
        return this;
    },
    info(msg) {
        console.info(msg);
        return this;
    },
    warn(msg) {
        console.warn(msg);
        return this;
    },
    error(msg) {
        console.error(msg);
        return this;
    }
};
function buildMessages() {
    return {
        messages: buildMessagesCore(),
    };
}
function buildMessagesCore() {
    return {
        items: [],
        trace(msg) {
            this.items.push({ type: 'info', msg });
            return this;
        },
        info(msg) {
            this.items.push({ type: 'info', msg });
            return this;
        },
        warn(msg) {
            this.items.push({ type: 'warn', msg });
            return this;
        },
        error(msg) {
            this.items.push({ type: 'error', msg });
            return this;
        },
    };
}
var ChangeDirectory;
(function (ChangeDirectory) {
    function performDirectoryChange(_absoluteOldCurrentDirectory, _absoluteNewCurrentDirectory, _relativeNewCurrentDirectory, log) {
        try {
            const relativeOldWorkingDir = path.relative(_absoluteNewCurrentDirectory, _absoluteOldCurrentDirectory);
            log.trace(`Changing current directory back to: ${relativeOldWorkingDir.green} [${_absoluteNewCurrentDirectory.gray}]`);
            process.chdir(_absoluteOldCurrentDirectory);
        }
        catch (err) {
            log.error(`Error changing working directory back to: ${_absoluteOldCurrentDirectory.red} [${_absoluteNewCurrentDirectory.gray}]`);
            throw err;
        }
    }
    function Async(args) {
        let directoryWasChanged = false;
        let _absoluteOldCurrentDirectory;
        let _absoluteNewCurrentDirectory;
        let _relativeNewCurrentDirectory;
        let log = exports.NullLogger;
        return new Promise((resolve, reject) => {
            const { absoluteNewCurrentDirectory, currentDirectoryOverride = process.cwd(), action, caseSensitive = true } = args;
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
                log.trace(`Changed current directory to: ${relativeNewCurrentDirectory.green} [${absoluteNewCurrentDirectory.gray}]`);
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
    const baseDir = process.cwd();
    const absoluteBaseDir = path.resolve(baseDir);
    let controlFilename = '.cw_module_links';
    let moduleTarget = 'link_modules';
    let moduleTargetSource = 'default';
    let rebuild = false;
    let allowLinksInPackageInstallPath = false;
    let caseSensitive = false;
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
        console.log(`${pathLib.yellow} file paths`);
    }
    else if (pathMod.posix === path) {
        pathLib = 'POSIX';
        pathI = pathMod.posix;
        console.log(`${pathLib.yellow} file paths`);
    }
    else {
        console.log(`${pathLib.red} file paths`);
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
        .command(['--ignore-case'], () => {
        caseSensitive = false;
    });
    const commandsResult = commands.processCommands(argsIn);
    const { actionsMatched, args: { toPass: argsToPass, toPassLead: argsToPassLead, toPassAdditional: argsToPassAdditional } } = commandsResult;
    const compareStrings = getStringComparer(caseSensitive);
    console.log(`Case-Sensitive Paths: ${caseSensitive ? 'true'.red : 'false'.green}`);
    const absolutePackagePath = path.resolve(absoluteBaseDir, packageFilename);
    function getPackageInfo(packagePath) {
        try {
            return { success: true, packageInfo: require(packagePath) };
        }
        catch (err) {
            return { success: false, err, message: `Error loading package.json '${packagePath.gray}'; err: ${chalk.gray(err)}` };
        }
    }
    const packageResult = getPackageInfo(absolutePackagePath);
    if (packageResult.success === false) {
        console.error(packageResult.message);
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
        console.info(mes);
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
    const currentDirectory = process.cwd();
    console.log(`moduleTarget: ${moduleTarget.green}`);
    console.log(`absoluteBaseDir: ${absoluteBaseDir.green}`);
    console.log(`absoluteModuleDir: ${absoluteModuleDir.green}`);
    console.log(`currentDirectory: ${currentDirectory.green}`);
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
        console.warn(`${'BAD SymlinkPackagesToRemap'.red} ${`package paths must start with '${filePrefix.green}'`}: ${_.values(badSymlinkPackagesToRemap).map(x => `${x.fullPackageName.gray}: ${x.rawValue.yellow}`).join('; ')}`);
    }
    const symlinkPackagesToRemapKeys = Object.keys(symlinkPackagesToRemap);
    if (symlinkPackagesToRemapKeys.length > 0) {
        console.log(`${'symlinkPackagesToRemap'.blue} [${symlinkPackagesToRemapKeys.length}]: ${_.values(symlinkPackagesToRemap).map(x => `${x.packageName.gray}: ${x.rawValue.yellow}`).join('; ')}`);
    }
    else {
        console.log(`No ${'symlinkPackagesToRemap'.yellow} to map.`);
        return Promise.resolve(0);
    }
    const packagesNeedingInstallPathPresent = _.values(symlinkPackagesToRemap).filter(x => x.ensurePackageInstallPathPresent);
    const groupedPackagesNeedingInstallPath = _.groupBy(packagesNeedingInstallPathPresent, x => x.packageInstallHardFolderPath);
    const moduleDirInstallInfo = { name: 'root module dir', absolutePackageInstallPath: absoluteModuleDir, dependantPackages: symlinkPackagesToRemapKeys };
    const ensureInstallPathsPresent = _.map(groupedPackagesNeedingInstallPath, (val, key) => {
        const fV = val[0];
        const packages = val.map(p => p.fullPackageName);
        return {
            name: `sub-module dir '${key.yellow}'`,
            absolutePackageInstallPath: fV.absolutePackageInstallPath,
            dependantPackages: packages,
        };
    });
    function ensureInstallPathPresent(install) {
        const messages = buildMessagesCore();
        const core = { install, messages, };
        const { absolutePackageInstallPath, dependantPackages, name } = install;
        messages.trace(`ensureInstallPathPresent: ${'getStatInfo.Async: '.green} ${name.yellow}; absolutePackageInstallPath: [${absolutePackageInstallPath.gray}] allowLinksInPackageInstallPath: [${allowLinksInPackageInstallPath ? 'true'.red : 'false'.yellow}] DependantPackages: ${dependantPackages.toString().gray}`);
        return getStatInfo_1.getStatInfo.Async(absolutePackageInstallPath, allowLinksInPackageInstallPath).then(stats => {
            if (stats.result === 'stat-returned') {
                messages.info(`${'Install path already exists for: '.green} ${name.yellow}; DependantPackages: ${dependantPackages.toString().gray}`);
                if (stats.isDirectory) {
                    const ret = Object.assign({ status: 'exists' }, core);
                    return ret;
                }
                else {
                    const ret = Object.assign({ status: 'error', errorMessage: `${'Cannot use install path for: '.red} ${name.yellow} because it's ${'not a directory'.red}; stats: ${JSON.stringify(stats, null, 1).gray} DependantPackages: ${dependantPackages.toString().gray}` }, core);
                    return ret;
                }
            }
            else if (stats.result === 'not-found') {
                messages.trace(`${'Making install path for: '.green} ${name.yellow}; DependantPackages: ${dependantPackages.toString().gray}`);
                return fs.mkdirAsync(absolutePackageInstallPath).then(() => {
                    messages.info(`${'Made install path for: '.green} ${name.yellow}`);
                    return Object.assign({ status: 'create' }, core);
                }).catch(err => {
                    const ret = Object.assign({ status: 'error', errorMessage: `${'Error making install path for: '.red} ${name.yellow}; DependantPackages: ${dependantPackages.toString().gray}` }, core);
                    return ret;
                });
            }
            else {
                const ret = Object.assign({ status: 'error', errorMessage: `${'Other error while trying to make install path for: '.red} ${name.yellow}; err: ${chalk.gray(stats.errorObject)}; DependantPackages: ${dependantPackages.toString().gray}` }, core);
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
                        switch (item.type) {
                            case 'error':
                                console.error(item.msg);
                                break;
                            case 'warn':
                                console.warn(item.msg);
                                break;
                            default:
                            case 'info':
                                console.info(item.msg);
                                break;
                        }
                    }
                }
            }
            if (errorMessage) {
                console.error(errorMessage);
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
        function sad() {
            try {
                const absoluteControlFilePath = path.resolve(absoluteModuleDir, controlFilename);
                let currentControlFileOptions;
                try {
                    if (fs.existsSync(absoluteControlFilePath)) {
                        currentControlFileOptions = fs.readJsonSync(absoluteControlFilePath);
                    }
                }
                catch (err) {
                    console.warn(`${'FAILED:  '.red} to open control file '${controlFilename.yellow}' at '${absoluteModuleDir.gray}.  Err: ${chalk.gray(err)}`);
                }
                function linkModuleAsync(info) {
                    const { packageName, fullPackageName, absoluteLinkToSourcePath, relativeLinkToSourcePath, packageInstallHardFolderPath, absolutePackageInstallPath, absoluteSourcePath, absolutePackageDestinationPath, relativeSourcePath } = info;
                    const messages = buildMessagesCore();
                    const core = Object.assign({}, info, { messages });
                    return getStatInfo_1.getStatInfo.Async(absolutePackageDestinationPath.clean, true).then(stats => {
                        function createSymLink(operationStatus, operationDescription) {
                            messages.trace(`Linking ${fullPackageName.yellow} with '${operationDescription}' as '${linkType.blue}' from '${relativeSourcePath.clean.green}' [${absoluteSourcePath.clean.gray}] to '${path.resolve(moduleTarget, fullPackageName).green}' [${absolutePackageDestinationPath.clean.gray}]`);
                            return fs.symlinkAsync(relativeLinkToSourcePath.clean, absolutePackageDestinationPath.clean, linkType)
                                .then(() => {
                                messages.info(`${'Linked:  '.green} ${fullPackageName.yellow} with '${operationDescription}' as '${linkType.blue}' from '${relativeSourcePath.clean.green} [${absoluteSourcePath.clean.gray}]'`);
                                const ret = Object.assign({ status: operationStatus }, core);
                                return ret;
                            })
                                .catch(err => {
                                const ret = Object.assign({ status: 'error', statusSub: 'creating-symlink', errorMessage: `${'Error creating symlink: '.red} with '${operationDescription}' as '${linkType.blue}' from '${relativeSourcePath.clean.green} [${absoluteSourcePath.clean.gray}]; Err: ${chalk.gray(err)}` }, core);
                                return ret;
                            });
                        }
                        if (stats.result === 'stat-returned') {
                            if (stats.isSymbolicLink) {
                                messages.trace(`${'Install path already a symlink for: '.green} ${fullPackageName.yellow} [${absolutePackageDestinationPath.clean.gray}]`);
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
                                        messages.trace(`${'Existing symlink same:  '.green} existingLinkTarget: ${existingLinkTarget.clean.gray}; relativeLinkToSourcePath: ${relativeLinkToSourcePath.clean.gray}`);
                                        const ret = Object.assign({ status: 'exists' }, core);
                                        return ret;
                                    }
                                    else {
                                        if (existingDiffersByCase) {
                                            messages.warn(`${'Existing symlink only differs by case'.red} (to ignore case use ${'--ignore-case'.blue})  existingLinkTarget: ${existingLinkTarget.clean.yellow}; relativeLinkToSourcePath: ${relativeLinkToSourcePath.clean.yellow}`);
                                        }
                                        messages.trace(`${'Removing existing symlink for:  '.yellow} ${fullPackageName.yellow} [${absolutePackageDestinationPath.clean.gray}]`);
                                        return Promise.resolve(del(absolutePackageDestinationPath.clean))
                                            .then(() => createSymLink('mapped-recreate', 'recreate'.red))
                                            .catch(err => {
                                            const ret = Object.assign({ status: 'error', statusSub: 'remove-existing-symlink', errorMessage: `${'Error removing existing symlink for: '.red} ${fullPackageName.yellow} [${absolutePackageDestinationPath.clean.gray}]; Err: ${chalk.gray(err)}` }, core);
                                            return ret;
                                        });
                                    }
                                })
                                    .catch(err => {
                                    const ret = Object.assign({ status: 'error', statusSub: 'read-existing-symlink', errorMessage: `${'Error readlinkAsync for: '.red} ${fullPackageName.yellow} [${absolutePackageDestinationPath.clean.gray}]; Err: ${chalk.gray(err)}` }, core);
                                    return ret;
                                });
                            }
                            else {
                                const ret = Object.assign({ status: 'error', statusSub: 'exist-not-symlink', errorMessage: `${'Target location exists but is not a symlink: '.red} ${fullPackageName.yellow}; Location [${absolutePackageDestinationPath.clean.gray}]; Stat: [${JSON.stringify(stats, null, 1).gray}]` }, core);
                                return ret;
                            }
                        }
                        else if (stats.result === 'not-found') {
                            return createSymLink('mapped-recreate', 'recreate'.red);
                        }
                        else {
                            const ret = Object.assign({ status: 'error', statusSub: 'other', errorMessage: `${'Other error from getStatInfo: '.red} ${fullPackageName.yellow}; Location [${absolutePackageDestinationPath.clean.gray}]; Err: [${chalk.gray(stats.errorObject)}]` }, core);
                            return ret;
                        }
                    })
                        .catch(err => {
                        const ret = Object.assign({ status: 'error', statusSub: 'get-stat-info', errorMessage: `${'Error getStatInfo for: '.red} ${fullPackageName.yellow} [${absolutePackageDestinationPath.clean.gray}]; Err: ${chalk.gray(err)}` }, core);
                        return ret;
                    });
                }
                const promisesToMap = _.values(symlinkPackagesToRemap).map(val => linkModuleAsync(val));
                return Promise.all(promisesToMap).then(res => {
                    res.forEach(p => printMessages(p));
                    console.log(`All done, creating [${symlinkPackagesToRemapKeys.length.toString().green}] symlinks`);
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
                console.error(`${'Error occurred'.red}:  ${err}`);
                throw err;
            }
        }
        return ChangeDirectory.Async({
            absoluteNewCurrentDirectory: absoluteModuleDir,
            action: (state) => sad(),
        });
    });
}
exports.moduleLinker = moduleLinker;
