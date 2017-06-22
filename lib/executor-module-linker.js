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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0b3ItbW9kdWxlLWxpbmtlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9leGVjdXRvci1tb2R1bGUtbGlua2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsa0JBQWdCO0FBQ2hCLG9DQUFvQztBQUVwQyw0QkFBNEI7QUFFNUIsK0JBQWdDO0FBSWhDLHVDQUF3QztBQUN4QyxnQ0FBZ0M7QUFDaEMsMkJBQTRCO0FBRTVCLE1BQU0sSUFBSSxHQUF5QixPQUFPLENBQUM7QUFJM0MscURBQWtEO0FBRWxELCtDQUE0QztBQUU1QyxNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUNuRCxNQUFNLGVBQWUsR0FBRyxlQUFlLENBQUMsSUFBYyxDQUFDO0FBQ3ZELE1BQU0sa0JBQWtCLEdBQUcsZUFBZSxDQUFDLE9BQWlCLENBQUM7QUFFN0QsaUNBQWlDLENBQVMsRUFBRSxDQUFTLElBQUksTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUEsQ0FBQyxDQUFDO0FBQUEsQ0FBQztBQUMxRSxtQ0FBbUMsQ0FBUyxFQUFFLENBQVMsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFFeEcsMkJBQTJCLGFBQXNCLElBQUksTUFBTSxDQUFDLGFBQWEsR0FBRyx1QkFBdUIsR0FBRyx5QkFBeUIsQ0FBQyxDQUFDLENBQUM7QUFrQnJILFFBQUEsVUFBVSxHQUFtQjtJQUN4QyxLQUFLLENBQUMsR0FBVztRQUNmLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbEIsTUFBTSxDQUFDLElBQUksQ0FBQztJQUNkLENBQUM7SUFDRCxJQUFJLENBQUMsR0FBVztRQUNkLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbEIsTUFBTSxDQUFDLElBQUksQ0FBQztJQUNkLENBQUM7SUFD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