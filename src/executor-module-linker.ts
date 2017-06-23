import 'colors';
// import * as Promise from 'bluebird';

import * as _ from 'lodash';

import ch = require('chalk');

import { DBlastMode, spawnerNpm, spawnerLines, spawnerBlast } from './npm/spawner';

import fs = require('fs-extra-promise');
import * as pathMod from 'path';
import del = require('del');

const path: typeof pathMod.posix = pathMod;

import { unquote } from './unquote';

import { CommandBuilder } from './commandBuilder';
import { ChangeDirectory } from './changeDirectory';

import { getStatInfo } from './getStatInfo';

import { GlobalLogger, IMessageLogger, changeGlobalLogger, IMessages, buildMessagesCore } from './logger';

import { stringComparer } from './stringComparer';


import { ThisPackage } from './thisPackage';


type TPackageToRemapHeader = { fullPackageName: string, rawValue: string };
type TPackageToRemap = TPackageToRemapHeader & {
  packageName: string, splitPackageName: string[], packageDestinationInModules: TPath, relativeSourcePath: TPath, absoluteSourcePath: TPath,
  ensurePackageInstallPathPresent: boolean, packageInstallHardFolderPath: string, absolutePackageInstallPath: string, relativePackageInstallPath: string,
  absoluteLinkToSourcePath: TPath, relativeLinkToSourcePath: TPath, absolutePackageDestinationPath: TPath, linkType: string,
};


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
type TPackageMappedError = TPackageMappedCore & IMessages.WithError & {
  status: 'error',
  statusSub: 'other' | 'exist-not-symlink' | 'read-existing-symlink' |
  'remove-existing-symlink' | 'get-stat-info' | 'creating-symlink',
}

type TPackageMapped = (TPackageMappedGood | TPackageMappedError);


export function moduleLinker(exec: { commandText: string, argsIn?: string[], argsAsIs?: string[], argsToNpm?: string[] }): Promise<any> {

  let { commandText, argsIn = [], argsAsIs = [], argsToNpm = [] } = exec;
  if (argsIn.length === 0) {
    argsIn = process.argv.slice(2);
  } else {
    if (argsAsIs.length === 0) {
      argsIn = argsIn.concat(process.argv.slice(2))
    }
  }
  {
    const titleLine = `${'Cycloware'.blue} ${'Module Linker'.green.bold.italic}`;
    const titleLineLength = ch.stripColor(titleLine).length;
    GlobalLogger.info(
      `${titleLine}    
${'-'.repeat(titleLineLength).green}
`)
  }
  const baseDir = process.cwd();
  const absoluteBaseDir = path.resolve(baseDir);

  let controlFilename = '.cw_module_links'
  let moduleTarget = 'link_modules';
  let moduleTargetSource = 'default';
  let rebuild = false;
  let allowLinksInPackageInstallPath = false;
  let caseSensitive = false;

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
    .command(['--quiet'], () => {
      changeGlobalLogger(['warn', 'error'])
    })
    .command(['--verbose'], () => {
      changeGlobalLogger(['trace', 'info', 'warn', 'error'])
    })
    .command(['--ignore-case'], () => {
      caseSensitive = false;
    })
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

    GlobalLogger.trace(` + File paths: ${pathLib.blue}`);
  } else if (pathMod.posix === path) {
    pathLib = 'POSIX';
    pathI = pathMod.posix;
    GlobalLogger.trace(` + File paths: ${pathLib.blue}`);
  } else {
    GlobalLogger.trace(` + File paths: ${pathLib.red}`);
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

  const compareStrings = stringComparer.get(caseSensitive)
  GlobalLogger.trace(` + Case-Sensitive Paths: ${caseSensitive ? 'true'.red : 'false'.blue}`)

  const absolutePackagePath = path.resolve(absoluteBaseDir, packageFilename);

  function getPackageInfo(packagePath: string): { success: true, packageInfo: any } | { success: false, err: any, message: string } {
    try {
      return { success: true, packageInfo: fs.readJSONSync(packagePath) };
    }
    catch (err) {
      return { success: false, err, message: `Error loading package.json '${packagePath.gray}'; err: ${ch.gray(err)}` }
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
  const sectionOptionsName = 'cw:linkModules:options'
  const { packageInfo } = packageResult;
  const packagesToInclude: TIndexerToString = packageInfo[sectionName];
  if (typeof packagesToInclude !== 'object') {
    const mes = `No section '${sectionName.yellow}' in package.json`;
    GlobalLogger.error(mes);
    return Promise.reject(mes);
  }

  type TLinkModuleOptions = {
    targetDir: string;
  }

  const linkModuleOptions: TLinkModuleOptions = packageInfo[sectionOptionsName];
  if (linkModuleOptions) {
    if (moduleTargetSource === 'default') {
      const { targetDir } = linkModuleOptions;
      if (typeof targetDir === 'string') {
        moduleTarget = targetDir;
        moduleTargetSource = 'config';
      } else if (targetDir) {
        const msg = ch.gray(`${'Unknown type'.red} for property ${'targetDir'.white} in ${sectionOptionsName.white}, expected a ${'string'.green}, but got typeof '${(typeof targetDir).red}' [${ch.white(targetDir)}]`);
        console.error(msg)
        return Promise.reject(msg.strip);
      }
    }
  }
  const absoluteModuleDir = path.resolve(absoluteBaseDir, moduleTarget);
  const relativeModuleDir = path.relative(absoluteBaseDir, absoluteModuleDir);
  const currentDirectory = process.cwd();
  GlobalLogger.trace(` + moduleTarget: ${moduleTarget.blue}`)
  GlobalLogger.trace(` + absoluteBaseDir: ${absoluteBaseDir.blue}`);
  GlobalLogger.trace(` + absoluteModuleDir: ${absoluteModuleDir.blue}`);
  GlobalLogger.trace(` + currentDirectory: ${currentDirectory.blue}`);

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
    GlobalLogger.warn(` + ${'BAD SymlinkPackagesToRemap'.red} ${`package paths must start with '${filePrefix.green}'`}: ${_.values(badSymlinkPackagesToRemap).map(x => `${x.fullPackageName.gray}: ${x.rawValue.yellow}`).join('; ')}`);
  }

  const symlinkPackagesToRemapKeys = Object.keys(symlinkPackagesToRemap);
  if (symlinkPackagesToRemapKeys.length > 0) {
    GlobalLogger.trace(ch.gray(`${' + symlinkPackagesToRemap'.white} [${ch.white(symlinkPackagesToRemapKeys.length)}]: ${_.values(symlinkPackagesToRemap).map(x => `${x.fullPackageName.yellow} [${x.rawValue.white}]`).join(', ')}`));
  }
  else {
    GlobalLogger.warn(` + No ${'symlinkPackagesToRemap'.yellow} to map.`);
    return Promise.resolve(0);
  }
  const packagesNeedingInstallPathPresent = _.values(symlinkPackagesToRemap).filter(x => x.ensurePackageInstallPathPresent);
  const groupedPackagesNeedingInstallPath = _.groupBy(packagesNeedingInstallPathPresent, x => x.packageInstallHardFolderPath);

  type TPackageInstallPath = {
    name: string,
    type: string,
    absolutePackageInstallPath: string;
    relativePackageInstallPath: string;
    dependantPackages: string[];
  };

  const moduleDirInstallInfo = { name: moduleTarget, type: 'Link Module Directory', absolutePackageInstallPath: absoluteModuleDir, relativePackageInstallPath: relativeModuleDir, dependantPackages: symlinkPackagesToRemapKeys };

  const ensureInstallPathsPresent: TPackageInstallPath[] =
    _.map(groupedPackagesNeedingInstallPath, (val, key) => {
      const fV = val[0];
      const packages = val.map(p => p.fullPackageName);
      return {
        name: key.yellow,
        type: 'Sub Module Directory',
        absolutePackageInstallPath: fV.absolutePackageInstallPath,
        relativePackageInstallPath: fV.relativePackageInstallPath,
        dependantPackages: packages,
      }
    });

  type TInstallPathCore = { install: TPackageInstallPath } & IMessages
  type TInstallPathGood = TInstallPathCore & {
    status: 'create' | 'exists',
  }
  type TInstallPathError = TInstallPathCore & IMessages.WithError & {
    status: 'error',
  }

  type TInstallPathResult = (TInstallPathGood | TInstallPathError);


  function ensureInstallPathPresent(install: TPackageInstallPath): Promise<TInstallPathResult> {

    const messages = buildMessagesCore();
    const core: TInstallPathCore = { install, messages, }

    const { absolutePackageInstallPath, relativePackageInstallPath, dependantPackages, name, type } = install;
    messages.info(ch.gray(`${'Ensure Exists'.white}: ${relativePackageInstallPath.yellow} [${type}]`));
    messages.trace(ch.gray(` -- absolutePackageInstallPath: [${absolutePackageInstallPath.gray}] allowLinksInPackageInstallPath: [${allowLinksInPackageInstallPath ? 'true'.red : 'false'.yellow}] DependantPackages: ${dependantPackages}`))
    return getStatInfo.Async(absolutePackageInstallPath, allowLinksInPackageInstallPath).then(stats => {
      if (stats.result === 'stat-returned') {
        messages.trace(ch.gray(` -- ${'already exists'.green}: ${relativePackageInstallPath.yellow}`))
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
            errorMessage: ch.gray(` -- ${`cannot use install path ${relativePackageInstallPath.yellow} because it is NOT a directory`}; stats: ${JSON.stringify(stats, null, 1).gray}; absolutePackageInstallPath: ${absolutePackageInstallPath.white}  DependantPackages: ${dependantPackages.toString().gray}`),
            ...core,
          };
          return ret;
        }
      } else if (stats.result === 'not-found') {
        messages.trace(ch.gray(` -- ${'creating directory'.blue}: ${relativePackageInstallPath.yellow}`))
        return fs.mkdirAsync(absolutePackageInstallPath).then(() => {
          messages.trace(ch.gray(` -- ${'created directory'.green}: ${relativePackageInstallPath.yellow}`))
          return {
            status: 'create',
            ...core,
          } as TInstallPathGood;
        }).catch(err => {
          const ret: TInstallPathError = {
            status: 'error',
            errorMessage: ch.gray(` -- ${'error creating directory'.red}: ${relativePackageInstallPath.yellow}; err: ${ch.gray(err)}; DependantPackages: ${dependantPackages.toString().gray}`),
            ...core,
          };
          return ret;
        })
      } else {
        const ret: TInstallPathError = {
          status: 'error',
          errorMessage: `${'Other error while trying to make install path for: '.red} ${name.yellow}; err: ${ch.gray(stats.errorObject)}; DependantPackages: ${dependantPackages.toString().gray}`,
          ...core,
        };
        return ret;
      }
    })
  }

  function printMessages(input: IMessages.WithPossibleError) {
    if (input) {
      const { messages, errorMessage } = input;
      if (messages) {
        const { items } = messages;
        if (items && items.length > 0) {
          for (const item of items) {
            GlobalLogger[item.type](item.msg);
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

    GlobalLogger.info('');

    return ChangeDirectory.Async({
      absoluteNewCurrentDirectory: absoluteModuleDir
    }, async (state) => {
      try {


        type TControlFileOptions = typeof _controlFileOptionsPrototype;
        const _controlFileOptionsPrototype = {
          ...ThisPackage,

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
        }

        const absoluteControlFilePath = path.resolve(absoluteModuleDir, controlFilename);
        let currentControlFileOptions: TControlFileOptions;
        try {
          if (fs.existsSync(absoluteControlFilePath)) {
            currentControlFileOptions = fs.readJsonSync(absoluteControlFilePath);
          }
        } catch (err) {
          if (err.code !== 'ENOENT') {
            GlobalLogger.warn(` + ${'FAILED:  '.red} to open control file '${controlFilename.yellow}' at '${absoluteModuleDir.gray}.  Err: ${ch.gray(err)}`);
          }
        }

        function linkModuleAsync(info: TPackageToRemap): Promise<TPackageMapped> {
          const { packageName, fullPackageName, absoluteLinkToSourcePath, relativeLinkToSourcePath,
            packageInstallHardFolderPath, absolutePackageInstallPath, absoluteSourcePath,
            absolutePackageDestinationPath, relativeSourcePath } = info;

          const messages = buildMessagesCore();
          const core: TPackageMappedCore = { ...info, messages, }

          messages.info(ch.white(`${'Symlink'.white}:  ${fullPackageName.yellow} -> ${relativeSourcePath.clean.gray}`));
          // messages.trace(ch.gray(` -- absolutePackageInstallPath: [${absolutePackageInstallPath.gray}] allowLinksInPackageInstallPath: [${allowLinksInPackageInstallPath ? 'true'.red : 'false'.yellow}] DependantPackages: ${dependantPackages}`))
          return getStatInfo.Async(absolutePackageDestinationPath.clean, true).then(stats => {

            function createSymLink(operationStatus: 'mapped-recreate' | 'mapped-fresh', operationDescription: string) {
              messages.info(ch.gray(` -- ${'linking'.green} ${fullPackageName.yellow} with '${operationDescription}' as '${linkType.blue}' from '${relativeSourcePath.clean.green}' [${absoluteSourcePath.clean.gray}] to '${path.resolve(moduleTarget, fullPackageName).green}' [${absolutePackageDestinationPath.clean.gray}]`))

              return fs.symlinkAsync(relativeLinkToSourcePath.clean, absolutePackageDestinationPath.clean, linkType)
                .then(() => {
                  messages.info(ch.gray(` -- ${'LINKED'.green}'`));
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
                    errorMessage: `${' -- Error creating symlink: '.red} with '${operationDescription}' as '${linkType.blue}' from '${relativeSourcePath.clean.green} [${absoluteSourcePath.clean.gray}]; Err: ${ch.gray(err)}`,
                    ...core,
                  };
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
                    let existingDiffersByCase: boolean = undefined;
                    if (!existingMatch && caseSensitive) {
                      existingDiffersByCase = stringComparer.Insensitive(existingLinkTarget.clean, relativeLinkToSourcePath.clean);
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
                      const ret: TPackageMappedGood = {
                        status: 'exists',
                        ...core,
                      }
                      return ret;
                    } else {
                      if (existingDiffersByCase) {
                        messages.warn(ch.gray(` -- install target ${'only differs by CASE'.red} (to ignore case use ${'--ignore-case'.blue})  existingLinkTarget: ${existingLinkTarget.clean.yellow}; relativeLinkToSourcePath: ${relativeLinkToSourcePath.clean.yellow}`));
                      }

                      messages.trace(ch.gray(` -- install target ${'does NOT match'.yellow}, will rebuild symlink.  existingTarget: ${existingLinkTarget.clean.white}, expectedTarget: ${relativeLinkToSourcePath.clean.white}`));
                      return Promise.resolve(del(absolutePackageDestinationPath.clean))
                        .then(() => createSymLink('mapped-recreate', 'recreate'.red))
                        .catch(err => {
                          const ret: TPackageMappedError = {
                            status: 'error',
                            statusSub: 'remove-existing-symlink',
                            errorMessage: ` -- ${'Error removing existing symlink for: '.red} ${fullPackageName.yellow} [${absolutePackageDestinationPath.clean.gray}]; Err: ${ch.gray(err)}`,
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
                      errorMessage: ` -- ${'Error readlinkAsync for: '.red} ${fullPackageName.yellow} [${absolutePackageDestinationPath.clean.gray}]; Err: ${ch.gray(err)}`,
                      ...core,
                    };
                    return ret;
                  });
              }
              else {
                const ret: TPackageMappedError = {
                  status: 'error',
                  statusSub: 'exist-not-symlink',
                  errorMessage: ` -- ${'Target location exists but is not a symlink: '.red} ${fullPackageName.yellow}; Location [${absolutePackageDestinationPath.clean.gray}]; Stat: [${JSON.stringify(stats, null, 1).gray}]`,
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
                errorMessage: ` -- ${'Other error from getStatInfo: '.red} ${fullPackageName.yellow}; Location [${absolutePackageDestinationPath.clean.gray}]; Err: [${ch.gray(stats.errorObject)}]`,
                ...core,
              };
              return ret;
            }
          })
            .catch(err => {
              const ret: TPackageMappedError = {
                status: 'error',
                statusSub: 'get-stat-info',
                errorMessage: ` -- ${'Error getStatInfo for: '.red} ${fullPackageName.yellow} [${absolutePackageDestinationPath.clean.gray}]; Err: ${ch.gray(err)}`,
                ...core,
              };
              return ret;
            })
        }

        const promisesToMap = _.values(symlinkPackagesToRemap).map(val => linkModuleAsync(val));
        return Promise.all(promisesToMap).then(res => {
          res.forEach(p => printMessages(p));

          GlobalLogger.info('');
          GlobalLogger.warn(`Installed ${ch.green(symlinkPackagesToRemapKeys.length)} symlinks`);

          const mappedPackagesKeys = Object.keys(mappedPackages);

          type IControlFileOptions = typeof newControlFileOptions;

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
          }

          fs.writeJSONSync(absoluteControlFilePath, newControlFileOptions, { spaces: 2 });

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
    })
  })

}
