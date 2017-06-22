import 'colors';
import * as Promise from 'bluebird';

import * as _ from 'lodash';

import chalk = require('chalk');

import { DBlastMode, spawnerNpm, spawnerLines, spawnerBlast } from './npm/spawner';

import fs = require('fs-extra-promise');
import * as pathMod from 'path';
import del = require('del');

const path: typeof pathMod.posix = pathMod;

import { unquote } from './unquote';

import { CommandBuilder } from './commandBuilder';

import { getStatInfo } from './getStatInfo';

const thisPackageInfo = require('../package.json');
const thisPackageName = thisPackageInfo.name as string;
const thisPackageVersion = thisPackageInfo.version as string;

function compareStringsSensitive(x: string, y: string) { return x === y };
function compareStringsInsensitive(x: string, y: string) { return x.toLowerCase() === y.toLowerCase(); }

function getStringComparer(caseSensitive: boolean) { return caseSensitive ? compareStringsSensitive : compareStringsInsensitive; }

type TPackageToRemapHeader = { fullPackageName: string, rawValue: string };
type TPackageToRemap = TPackageToRemapHeader & {
  packageName: string, splitPackageName: string[], packageDestinationInModules: TPath, relativeSourcePath: TPath, absoluteSourcePath: TPath,
  ensurePackageInstallPathPresent: boolean, packageInstallHardFolderPath: string, absolutePackageInstallPath: string,
  absoluteLinkToSourcePath: TPath, relativeLinkToSourcePath: TPath, absolutePackageDestinationPath: TPath, linkType: string,
};

// type TMessages = { errorMessage?: string, messages: { info: string[], warn: string[] }, };

export type IMessageLogger = {[P in KLogger]: (msg: string) => void};
export type KLogger = 'trace' | 'info' | 'warn' | 'error';

const _consoleLoggerAllLevels = {
  trace(msg: string) {
    console.info(msg);
  },
  info(msg: string) {
    console.info(msg);
  },
  warn(msg: string) {
    console.warn(msg);
  },
  error(msg: string) {
    console.error(msg);
  }
};

const _nullOp = () => { };

function buildLogger(levels: KLogger[]) {
  const ret = { ..._consoleLoggerAllLevels };
  for (const prop in ret) {
    if (levels.indexOf(prop as KLogger) < 0) {
      ret[prop as KLogger] = _nullOp;
    }
  }
  return ret;
}

export let GlobalLogger: IMessageLogger = buildLogger(['warn', 'error']);

interface IMessagesCore extends IMessageLogger {
  readonly items: { type: KLogger, msg: string }[];
}
interface IMessages {
  messages: IMessagesCore;
}

interface IMessagesWithError extends IMessages {
  errorMessage: string;
}
interface IMessagesWithPossibleError extends IMessages {
  errorMessage?: string;
}
function buildMessages(): IMessages {
  return {
    messages: buildMessagesCore(),
  }
}
function buildMessagesCore(): IMessagesCore {
  return {
    items: [],

    trace(msg: string) {
      this.items.push({ type: 'trace', msg });
    },
    info(msg: string) {
      this.items.push({ type: 'info', msg });
    },
    warn(msg: string) {
      this.items.push({ type: 'warn', msg })
    },
    error(msg: string) {
      this.items.push({ type: 'error', msg })
    },
  };
}

type TPath = { clean: string, raw: string };


type TPackageMappedCore = TPackageToRemap & IMessages & {
  existing?: {
    linkTarget: TPath,
    absoluteLinkTarget: TPath,
    caseSensitive: boolean,

    existingMatch: boolean,

    existingDiffersByCase?: boolean,
  },
};
type TPackageMappedGood = TPackageMappedCore & {
  status: 'mapped-fresh' | 'exists' | 'mapped-recreate',

}
type TPackageMappedError = TPackageMappedCore & IMessagesWithError & {
  status: 'error',
  statusSub: 'other' | 'exist-not-symlink' | 'read-existing-symlink' |
  'remove-existing-symlink' | 'get-stat-info' | 'creating-symlink',
}

type TPackageMapped = (TPackageMappedGood | TPackageMappedError);

export namespace ChangeDirectory {

  export type TState = {
    currentDirectory: {
      old: string,
      new: string,
    },
    changed: boolean,
    caseSensitive: boolean,
    relativeNewCurrentDirectory: string,
  }

  function performDirectoryChange(_absoluteOldCurrentDirectory: string, _absoluteNewCurrentDirectory: string, _relativeNewCurrentDirectory: string, log: IMessageLogger) {
    try {
      const relativeOldWorkingDir = path.relative(_absoluteNewCurrentDirectory, _absoluteOldCurrentDirectory);
      log.trace(`Changing current directory back to: ${relativeOldWorkingDir.green} [${_absoluteNewCurrentDirectory.gray}]`);
      process.chdir(_absoluteOldCurrentDirectory);
    } catch (err) {
      log.error(`Error changing working directory back to: ${_absoluteOldCurrentDirectory.red} [${_absoluteNewCurrentDirectory.gray}]`)
      throw err;
    }
  }

  export function Async<TResult>(args: {
    absoluteNewCurrentDirectory: string, action: (state?: TState) => Promise<TResult>,
    log?: IMessageLogger, currentDirectoryOverride?: string, caseSensitive?: boolean
  }): Promise<TResult> {

    let directoryWasChanged = false;
    let _absoluteOldCurrentDirectory: string;
    let _absoluteNewCurrentDirectory: string;
    let _relativeNewCurrentDirectory: string;
    let log = GlobalLogger;
    return new Promise<TResult>((resolve, reject) => {
      const { absoluteNewCurrentDirectory, currentDirectoryOverride = process.cwd(), action,
        caseSensitive = true } = args;

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

      const state: TState = {
        currentDirectory: {
          old: absoluteOldCurrentDirectory,
          new: absoluteNewCurrentDirectory,
        },
        changed: directoryWasChanged,
        caseSensitive,
        relativeNewCurrentDirectory,
      }
      resolve(action(state));
    }).finally(() => {
      if (directoryWasChanged) {
        performDirectoryChange(_absoluteOldCurrentDirectory, _absoluteNewCurrentDirectory, _relativeNewCurrentDirectory, log);
      }
    });
  }
}

export function moduleLinker(exec: { commandText: string, argsIn?: string[], argsAsIs?: string[], argsToNpm?: string[] }): Promise<any> {

  let { commandText, argsIn = [], argsAsIs = [], argsToNpm = [] } = exec;
  if (argsIn.length === 0) {
    argsIn = process.argv.slice(2);
  } else {
    if (argsAsIs.length === 0) {
      argsIn = argsIn.concat(process.argv.slice(2))
    }
  }

  const baseDir = process.cwd();
  const absoluteBaseDir = path.resolve(baseDir);

  let controlFilename = '.cw_module_links'
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

    GlobalLogger.info(`${pathLib.yellow} file paths`);
  } else if (pathMod.posix === path) {
    pathLib = 'POSIX';
    pathI = pathMod.posix;
    GlobalLogger.info(`${pathLib.yellow} file paths`);
  } else {
    GlobalLogger.info(`${pathLib.red} file paths`);
  }

  function cleanPath(pathIn: string) {
    return pathIn.split(pathSeperatorBad).join(pathSeperatorGood);
  }
  function cleanPathObj(pathIn: string): TPath {
    return {
      raw: pathIn,
      clean: cleanPath(pathIn),
    }
  }

  const packageFilename = 'package.json';

  const commands = CommandBuilder.Start()
    .command(['--target'],
    (nArgs) => {
      moduleTarget = nArgs[0];
      moduleTargetSource = 'command';
    }, {
      nArgs: 1,
    })
    .command(['--rebuild'], () => {
      rebuild = true;
    })
    .command(['--trace', '--verbose-trace'], () => {
      GlobalLogger = buildLogger(['trace', 'info', 'warn', 'error'])
    })
    .command(['--verbose'], () => {
      GlobalLogger = buildLogger(['info', 'warn', 'error'])
    })
    .command(['--ignore-case'], () => {
      caseSensitive = false;
    })
  const commandsResult = commands.processCommands(argsIn);
  const { actionsMatched, args: { toPass: argsToPass, toPassLead: argsToPassLead, toPassAdditional: argsToPassAdditional } } = commandsResult;

  const compareStrings = getStringComparer(caseSensitive)
  GlobalLogger.info(`Case-Sensitive Paths: ${caseSensitive ? 'true'.red : 'false'.green}`)


  const absolutePackagePath = path.resolve(absoluteBaseDir, packageFilename);
  function getPackageInfo(packagePath: string): { success: true, packageInfo: any } | { success: false, err: any, message: string } {
    try {
      return { success: true, packageInfo: require(packagePath) };
    }
    catch (err) {
      return { success: false, err, message: `Error loading package.json '${packagePath.gray}'; err: ${chalk.gray(err)}` }
    }
  }

  const packageResult = getPackageInfo(absolutePackagePath);
  if (packageResult.success === false) {
    GlobalLogger.error(packageResult.message)
    return Promise.reject(packageResult.message);
  }

  const symlinkPackagesToRemap: TIndexerTo<TPackageToRemap> = {};
  const badSymlinkPackagesToRemap: TIndexerTo<TPackageToRemapHeader> = {};
  const mappedPackages: { [key: string]: TPackageMapped } = {};

  const sectionName = 'cw:linkModules';
  const sectionOptionsName = 'cw:LinkModules:options'
  const { packageInfo } = packageResult;
  const packagesToInclude = packageInfo[sectionName];
  if (typeof packagesToInclude !== 'object') {
    const mes = `No section '${sectionName.yellow}' in package.json`;
    GlobalLogger.error(mes);
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
  GlobalLogger.trace(`moduleTarget: ${moduleTarget.green}`)
  GlobalLogger.trace(`absoluteBaseDir: ${absoluteBaseDir.green}`);
  GlobalLogger.trace(`absoluteModuleDir: ${absoluteModuleDir.green}`);
  GlobalLogger.trace(`currentDirectory: ${currentDirectory.green}`);

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
      }
    } else {
      badSymlinkPackagesToRemap[fullPackageName] = {
        fullPackageName,
        rawValue: value,
      }
    }
  }

  const badSymlinkPackagesToRemapKeys = Object.keys(badSymlinkPackagesToRemap);
  if (badSymlinkPackagesToRemapKeys.length > 0) {
    GlobalLogger.warn(`${'BAD SymlinkPackagesToRemap'.red} ${`package paths must start with '${filePrefix.green}'`}: ${_.values(badSymlinkPackagesToRemap).map(x => `${x.fullPackageName.gray}: ${x.rawValue.yellow}`).join('; ')}`);
  }

  const symlinkPackagesToRemapKeys = Object.keys(symlinkPackagesToRemap);
  if (symlinkPackagesToRemapKeys.length > 0) {
    GlobalLogger.trace(`${'symlinkPackagesToRemap'.blue} [${symlinkPackagesToRemapKeys.length}]: ${_.values(symlinkPackagesToRemap).map(x => `${x.packageName.gray}: ${x.rawValue.yellow}`).join('; ')}`);
  }
  else {
    GlobalLogger.warn(`No ${'symlinkPackagesToRemap'.yellow} to map.`);
    return Promise.resolve(0);
  }
  const packagesNeedingInstallPathPresent = _.values(symlinkPackagesToRemap).filter(x => x.ensurePackageInstallPathPresent);
  const groupedPackagesNeedingInstallPath = _.groupBy(packagesNeedingInstallPathPresent, x => x.packageInstallHardFolderPath);

  type TPackageInstallPath = {
    name: string,
    absolutePackageInstallPath: string;
    dependantPackages: string[];
  };

  const moduleDirInstallInfo = { name: 'root module dir', absolutePackageInstallPath: absoluteModuleDir, dependantPackages: symlinkPackagesToRemapKeys };

  const ensureInstallPathsPresent: TPackageInstallPath[] =
    _.map(groupedPackagesNeedingInstallPath, (val, key) => {
      const fV = val[0];
      const packages = val.map(p => p.fullPackageName);
      return {
        name: `sub-module dir '${key.yellow}'`,
        absolutePackageInstallPath: fV.absolutePackageInstallPath,
        dependantPackages: packages,
      }
    });

  type TInstallPathCore = { install: TPackageInstallPath } & IMessages
  type TInstallPathGood = TInstallPathCore & {
    status: 'create' | 'exists',
  }
  type TInstallPathError = TInstallPathCore & IMessagesWithError & {
    status: 'error',
  }

  type TInstallPathResult = (TInstallPathGood | TInstallPathError);

  function ensureInstallPathPresent(install: TPackageInstallPath): Promise<TInstallPathResult> {

    const messages = buildMessagesCore();
    const core: TInstallPathCore = { install, messages, }

    const { absolutePackageInstallPath, dependantPackages, name } = install;
    messages.trace(`ensureInstallPathPresent: ${'getStatInfo.Async: '.green} ${name.yellow}; absolutePackageInstallPath: [${absolutePackageInstallPath.gray}] allowLinksInPackageInstallPath: [${allowLinksInPackageInstallPath ? 'true'.red : 'false'.yellow}] DependantPackages: ${dependantPackages.toString().gray}`)
    return getStatInfo.Async(absolutePackageInstallPath, allowLinksInPackageInstallPath).then(stats => {
      if (stats.result === 'stat-returned') {
        messages.info(`${'Install path already exists for: '.green} ${name.yellow}; DependantPackages: ${dependantPackages.toString().gray}`)
        if (stats.isDirectory) {
          const ret: TInstallPathGood = {
            status: 'exists',
            ...core,
          }
          return ret;
        }
        else {
          const ret: TInstallPathError = {
            status: 'error',
            errorMessage: `${'Cannot use install path for: '.red} ${name.yellow} because it's ${'not a directory'.red}; stats: ${JSON.stringify(stats, null, 1).gray} DependantPackages: ${dependantPackages.toString().gray}`,
            ...core,
          };
          return ret;
        }
      } else if (stats.result === 'not-found') {
        messages.trace(`${'Making install path for: '.green} ${name.yellow}; DependantPackages: ${dependantPackages.toString().gray}`)
        return fs.mkdirAsync(absolutePackageInstallPath).then(() => {
          messages.info(`${'Made install path for: '.green} ${name.yellow}`)
          return {
            status: 'create',
            ...core,
          } as TInstallPathGood;
        }).catch(err => {
          const ret: TInstallPathError = {
            status: 'error',
            errorMessage: `${'Error making install path for: '.red} ${name.yellow}; DependantPackages: ${dependantPackages.toString().gray}`,
            ...core,
          };
          return ret;
        })
      } else {
        const ret: TInstallPathError = {
          status: 'error',
          errorMessage: `${'Other error while trying to make install path for: '.red} ${name.yellow}; err: ${chalk.gray(stats.errorObject)}; DependantPackages: ${dependantPackages.toString().gray}`,
          ...core,
        };
        return ret;
      }
    })
  }

  function printMessages(input: IMessagesWithPossibleError) {
    if (input) {
      const { messages, errorMessage } = input;
      if (messages) {
        const { items } = messages;
        if (items && items.length > 0) {
          for (const item of items) {
            switch (item.type) {
              case 'error':
                GlobalLogger.error(item.msg);
                break;
              case 'warn':
                GlobalLogger.warn(item.msg);
                break;
              case 'info':
                GlobalLogger.info(item.msg);
              case 'trace':
              default:
                GlobalLogger.trace(item.msg);
                break;
            }
          }
        }
      }
      if (errorMessage) {
        GlobalLogger.error(errorMessage);
      }
    }
  }

  return ensureInstallPathPresent(moduleDirInstallInfo).then(res => {
    printMessages(res);
    if (res.status === 'error') {
      return Promise.reject(res.errorMessage)
    }

    if (ensureInstallPathsPresent.length > 0) {
      return Promise.all(ensureInstallPathsPresent.map(x => ensureInstallPathPresent(x))).then(res => {
        res.forEach(p => printMessages(p));
        const errorInstallPaths: TInstallPathError[] = res.filter(p => p.status === 'error') as any;
        if (errorInstallPaths.length > 0) {
          return Promise.reject(`Package Install Paths failed for:
  ${errorInstallPaths.map(p => p.errorMessage).join('  \n')}`)
        }
        return res;
      })
    }
    return res;
  }).then(res => {

    function sad() {
      try {

        const absoluteControlFilePath = path.resolve(absoluteModuleDir, controlFilename);
        let currentControlFileOptions: any;
        try {
          if (fs.existsSync(absoluteControlFilePath)) {
            currentControlFileOptions = fs.readJsonSync(absoluteControlFilePath);
          }
        } catch (err) {
          GlobalLogger.warn(`${'FAILED:  '.red} to open control file '${controlFilename.yellow}' at '${absoluteModuleDir.gray}.  Err: ${chalk.gray(err)}`)
        }

        function linkModuleAsync(info: TPackageToRemap): Promise<TPackageMapped> {
          const { packageName, fullPackageName, absoluteLinkToSourcePath, relativeLinkToSourcePath,
            packageInstallHardFolderPath, absolutePackageInstallPath, absoluteSourcePath,
            absolutePackageDestinationPath, relativeSourcePath } = info;

          const messages = buildMessagesCore();
          const core: TPackageMappedCore = { ...info, messages, }

          return getStatInfo.Async(absolutePackageDestinationPath.clean, true).then(stats => {

            function createSymLink(operationStatus: 'mapped-recreate' | 'mapped-fresh', operationDescription: string) {
              messages.trace(`Linking ${fullPackageName.yellow} with '${operationDescription}' as '${linkType.blue}' from '${relativeSourcePath.clean.green}' [${absoluteSourcePath.clean.gray}] to '${path.resolve(moduleTarget, fullPackageName).green}' [${absolutePackageDestinationPath.clean.gray}]`)

              return fs.symlinkAsync(relativeLinkToSourcePath.clean, absolutePackageDestinationPath.clean, linkType)
                .then(() => {
                  messages.info(`${'Linked:  '.green} ${fullPackageName.yellow} with '${operationDescription}' as '${linkType.blue}' from '${relativeSourcePath.clean.green} [${absoluteSourcePath.clean.gray}]'`);
                  const ret: TPackageMappedGood = {
                    status: operationStatus,
                    ...core,
                  };
                  return ret;
                })
                .catch(err => {
                  const ret: TPackageMappedError = {
                    status: 'error',
                    statusSub: 'creating-symlink',
                    errorMessage: `${'Error creating symlink: '.red} with '${operationDescription}' as '${linkType.blue}' from '${relativeSourcePath.clean.green} [${absoluteSourcePath.clean.gray}]; Err: ${chalk.gray(err)}`,
                    ...core,
                  };
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
                    let existingDiffersByCase: boolean = undefined;
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
                      const ret: TPackageMappedGood = {
                        status: 'exists',
                        ...core,
                      }
                      return ret;
                    } else {
                      if (existingDiffersByCase) {
                        messages.warn(`${'Existing symlink only differs by case'.red} (to ignore case use ${'--ignore-case'.blue})  existingLinkTarget: ${existingLinkTarget.clean.yellow}; relativeLinkToSourcePath: ${relativeLinkToSourcePath.clean.yellow}`);
                      }

                      messages.trace(`${'Removing existing symlink for:  '.yellow} ${fullPackageName.yellow} [${absolutePackageDestinationPath.clean.gray}]`);
                      return Promise.resolve(del(absolutePackageDestinationPath.clean))
                        .then(() => createSymLink('mapped-recreate', 'recreate'.red))
                        .catch(err => {
                          const ret: TPackageMappedError = {
                            status: 'error',
                            statusSub: 'remove-existing-symlink',
                            errorMessage: `${'Error removing existing symlink for: '.red} ${fullPackageName.yellow} [${absolutePackageDestinationPath.clean.gray}]; Err: ${chalk.gray(err)}`,
                            ...core,
                          };
                          return ret;
                        })
                    }
                  })
                  .catch(err => {
                    const ret: TPackageMappedError = {
                      status: 'error',
                      statusSub: 'read-existing-symlink',
                      errorMessage: `${'Error readlinkAsync for: '.red} ${fullPackageName.yellow} [${absolutePackageDestinationPath.clean.gray}]; Err: ${chalk.gray(err)}`,
                      ...core,
                    };
                    return ret;
                  });
              }
              else {
                const ret: TPackageMappedError = {
                  status: 'error',
                  statusSub: 'exist-not-symlink',
                  errorMessage: `${'Target location exists but is not a symlink: '.red} ${fullPackageName.yellow}; Location [${absolutePackageDestinationPath.clean.gray}]; Stat: [${JSON.stringify(stats, null, 1).gray}]`,
                  ...core,
                };
                return ret;
              }
            } else if (stats.result === 'not-found') {
              return createSymLink('mapped-recreate', 'recreate'.red);
            } else {
              const ret: TPackageMappedError = {
                status: 'error',
                statusSub: 'other',
                errorMessage: `${'Other error from getStatInfo: '.red} ${fullPackageName.yellow}; Location [${absolutePackageDestinationPath.clean.gray}]; Err: [${chalk.gray(stats.errorObject)}]`,
                ...core,
              };
              return ret;
            }
          })
            .catch(err => {
              const ret: TPackageMappedError = {
                status: 'error',
                statusSub: 'get-stat-info',
                errorMessage: `${'Error getStatInfo for: '.red} ${fullPackageName.yellow} [${absolutePackageDestinationPath.clean.gray}]; Err: ${chalk.gray(err)}`,
                ...core,
              };
              return ret;
            })
        }

        const promisesToMap = _.values(symlinkPackagesToRemap).map(val => linkModuleAsync(val));
        return Promise.all(promisesToMap).then(res => {
          res.forEach(p => printMessages(p));

          GlobalLogger.info(`All done, creating [${symlinkPackagesToRemapKeys.length.toString().green}] symlinks`);

          const mappedPackagesKeys = Object.keys(mappedPackages);

          type IControlFileOptions = typeof newContorlOptons;

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
          }

          fs.writeJSONSync(absoluteControlFilePath, newContorlOptons, { spaces: 2 });

          const errros: TInstallPathError[] = res.filter(p => p.status === 'error') as any;
          if (errros.length > 0) {
            return Promise.reject(`linkModules failed for [${errros.length.toString().red}]:
        ${errros.map(p => p.errorMessage).join('  \n')}`)
          }
          return Promise.resolve(symlinkPackagesToRemap);
        })
      } catch (err) {
        GlobalLogger.error(`${'Error occurred'.red}:  ${err}`);
        throw err;
      }
    }
    return ChangeDirectory.Async({
      absoluteNewCurrentDirectory: absoluteModuleDir,
      action: (state) => sad(),
    })
  })

}
