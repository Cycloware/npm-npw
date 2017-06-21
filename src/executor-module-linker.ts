import 'colors';
import * as Promise from 'bluebird';

import * as _ from 'lodash';

import chalk = require('chalk');

import { DBlastMode, spawnerNpm, spawnerLines, spawnerBlast } from './npm/spawner';

import fs = require('fs-extra-promise');
import * as pathMod from 'path';

const path: typeof pathMod.posix = pathMod;

import { unquote } from './unquote';

import { CommandBuilder } from './commandBuilder';

import { getStatInfo } from './getStatInfo';

const thisPackageInfo = require('../package.json');
const thisPackageName = thisPackageInfo.name as string;
const thisPackageVersion = thisPackageInfo.version as string;

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

    console.log(`${pathLib.yellow} file paths`);
  } else if (pathMod.posix === path) {
    pathLib = 'POSIX';
    pathI = pathMod.posix;
    console.log(`${pathLib.yellow} file paths`);
  } else {
    console.log(`${pathLib.red} file paths`);
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
    .command(['--ignore-case'], () => {
      caseSensitive = false;
    })
  const commandsResult = commands.processCommands(argsIn);
  const { actionsMatched, args: { toPass: argsToPass, toPassLead: argsToPassLead, toPassAdditional: argsToPassAdditional } } = commandsResult;


  const compareStringsSensitive = (x: string, y: string) => x === y;
  const compareStringsInsensitive = (x: string, y: string) => x.toLowerCase() === y.toLowerCase();
  const compareStrings = caseSensitive ? compareStringsSensitive : compareStringsInsensitive;
  console.log(`Case-Sensitive Paths: ${caseSensitive ? 'true'.red : 'false'.green}`)


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
    console.error(packageResult.message)
    return Promise.reject(packageResult.message);
  }

  type TPackageToRemapHeader = { fullPackageName: string, rawValue: string };
  type TPackageToRemap = TPackageToRemapHeader & {
    packageName: string, splitPackageName: string[], packageDestinationInModules: TPath, relativeSourcePath: TPath, absoluteSourcePath: TPath,
    ensurePackageInstallPathPresent: boolean, packageInstallHardFolderPath: string, absolutePackageInstallPath: string,
    absoluteLinkToSourcePath: TPath, relativeLinkToSourcePath: TPath, absolutePackageDestinationPath: TPath, linkType: string,
  };

  // type TMessages = { errorMessage?: string, messages: { info: string[], warn: string[] }, };

  interface IMessagesCore {
    readonly items: { type: 'trace' | 'info' | 'warn' | 'error', msg: string }[];

    trace(msg: string): this;
    info(msg: string): this;
    warn(msg: string): this
    error(msg: string): this;
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
        this.items.push({ type: 'info', msg });
        return this;
      },
      info(msg: string) {
        this.items.push({ type: 'info', msg });
        return this;
      },
      warn(msg: string) {
        this.items.push({ type: 'warn', msg })
        return this;
      },
      error(msg: string) {
        this.items.push({ type: 'error', msg })
        return this;
      },
    };
  }

  type TPath = { clean: string, raw: string };


  const symlinkPackagesToRemap: TIndexerTo<TPackageToRemap> = {};
  const badSymlinkPackagesToRemap: TIndexerTo<TPackageToRemapHeader> = {};
  const mappedPackages: { [key: string]: TPackageMapped } = {};

  const sectionName = 'cw:linkModules';
  const sectionOptionsName = 'cw:LinkModules:options'
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
  console.log(`moduleTarget: ${moduleTarget.green}`)
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
          for (const msg of items) {
            console[msg.type](msg);
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

    const workingDirChanged = absoluteModuleDir.toLowerCase() !== currentDirectory.toLowerCase();
    try {
      if (workingDirChanged) {
        const newWorkingDir = path.relative(currentDirectory, absoluteModuleDir);
        console.log(`Changed working directory to absoluteModuleDir: ${newWorkingDir.green} [${absoluteModuleDir.gray}]`);
        process.chdir(newWorkingDir);
      }

      const absoluteControlFilePath = path.resolve(absoluteModuleDir, controlFilename);
      let currentControlFileOptions: IControlFileOptions;
      try {
        if (fs.existsSync(absoluteControlFilePath)) {
          currentControlFileOptions = fs.readJsonSync(absoluteControlFilePath);
        }
      } catch (err) {
        console.warn(`${'FAILED:  '.red} to open control file '${controlFilename.yellow}' at '${absoluteModuleDir.gray}.  Err: ${chalk.gray(err)}`)
      }

      try {
        const stats = fs.statSync(absoluteModuleDir);
      }
      catch (err) {
        fs.mkdirSync(absoluteModuleDir);
      }




      for (const fullPackageName in symlinkPackagesToRemap) {
      }



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
        statusSub?: 'exist-not-symlink'
      }

      type TPackageMapped = (TPackageMappedGood | TPackageMappedError);

      function linkModuleAsync(info: TPackageToRemap): Promise<TPackageMapped> {
        const { packageName, fullPackageName, absoluteLinkToSourcePath, relativeLinkToSourcePath,
          packageInstallHardFolderPath, absolutePackageInstallPath,
          absolutePackageDestinationPath, relativeSourcePath } = info;

        const messages = buildMessagesCore();
        const core: TPackageMappedCore = { ...info, messages, }

        messages.trace(`Linking from '${relativeSourcePath.clean.green}' [${relativeSourcePath.raw.gray}] to '${path.resolve(moduleTarget, fullPackageName).green}' [${absolutePackageDestinationPath.clean.gray}]`)

        return getStatInfo.Async(absolutePackageDestinationPath.clean, true).then(stats => {
          if (stats.result === 'stat-returned') {
            if (stats.isSymbolicLink) {
              messages.trace(`${'Install path already a symlink for: '.green} ${fullPackageName}; absolutePackageDestinationPath [${absolutePackageDestinationPath.clean.gray}]`)
              return fs.readlinkAsync(absolutePackageDestinationPath.clean).then(res => cleanPathObj(res)).
                then(existingLinkTarget => {
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

                  if (compareStrings(existingLinkTarget.clean, relativeLinkToSourcePath.clean)) {
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
                    //del symlink here!!!!
                  }
                })
              // return {
              //   status: 'exists',
              //   ...core,
              // } as TInstallPathGood;
            }
            else {
              // const ret: TInstallPathError = {
              //   status: 'error',
              //   errorMessage: `${'Cannot use install path for: '.red} ${name} because it's ${'not a directory'.red}; stats: ${JSON.stringify(stats, null, 1).gray} DependantPackages: ${dependantPackages.toString().gray}`,
              //   ...core,
              // };
              // return ret;
            }
          } else if (stats.result === 'not-found') {
            //   core.messages.info.push(`${'Making install path for: '.green} ${name}; DependantPackages: ${dependantPackages.toString().gray}`)
            //   return fs.mkdirAsync(absolutePackageInstallPath).then(() => {
            //     core.messages.info.push(`${'Made install path for: '.green} ${name}`)
            //     return {
            //       status: 'create',
            //       ...core,
            //     } as TInstallPathGood;fs
            //   }).catch(err => {
            //     const ret: TInstallPathError = {
            //       status: 'error',
            //       errorMessage: `${'Error making install path for: '.red} ${name}; DependantPackages: ${dependantPackages.toString().gray}`,
            //       ...core,
            //     };
            //     return ret;
            //   })
            // } else {
            //   const ret: TInstallPathError = {
            //     status: 'error',
            //     errorMessage: `${'Other error while trying to make install path for: '.red} ${name}; err: ${chalk.gray(stats.errorObject)}; DependantPackages: ${dependantPackages.toString().gray}`,
            //     ...core,
            //   };
            //   return ret;
          }
        })
        // const relativeDestination = path.relative(absolutePackageDestinationPath, absoluteModuleDir);
        console.log(`Linking from '${relativeSourcePath.green}' [${relativeSourcePathRaw.gray}] to '${absolutePackageDestinationPath.yellow}'`)
        fs.symlinkSync(relativeSourcePath, absolutePackageDestinationPath, linkType);

        const ret: TPackageMapped = {
          status: 'mapped',
          ...info,
          splitPackageName,
          packageName,
          fullPackageName,
          absolutePackageInstallPath,
          linkType,
          relativeSourcePath: {
            clean: relativeSourcePath,
            raw: relativeSourcePathRaw,
          },
          absolutePackageDestinationPath: {
            clean: absolutePackageDestinationPath,
            raw: absolutePackageDestinationPathRaw,
          },
        }
      }

      for (const fullPackageName in symlinkPackagesToRemap) {
        const splitPackageName = fullPackageName.split('/');
        let packageName = fullPackageName;

        const sourcePackageInfo = symlinkPackagesToRemap[fullPackageName];

        const { absolutePath: sourcePackageAbsolutePath } = sourcePackageInfo;

        let absolutePackageInstallPath = absoluteModuleDir;
        if (splitPackageName.length > 1) {
          const packageInstallHardFolderPath = splitPackageName.slice(0, splitPackageName.length - 1).join('/');
          packageName = splitPackageName[splitPackageName.length - 1];

          absolutePackageInstallPath = path.resolve(absolutePackageInstallPath, packageInstallHardFolderPath);

          const stats = getStatInfo.Sync(absolutePackageInstallPath, allowLinksInPackageInstallPath);
          if (stats.result === 'stat-returned') {
            if (!stats.isDirectory) {
              const msg = `Cannot link module '${fullPackageName.yellow}' because '${packageInstallHardFolderPath.yellow}' at '${absoluteModuleDir.yellow}' is not a directory.  stats: ${JSON.stringify(stats, null, 1).gray}`;
              console.error(msg)
              return Promise.reject(msg);
            }
          } else if (stats.result === 'not-found') {
            fs.mkdirSync(absolutePackageInstallPath);
          }
        }

        const absolutePackageDestinationPathRaw = path.resolve(absolutePackageInstallPath, packageName);
        const absolutePackageDestinationPath = cleanPath(absolutePackageDestinationPathRaw);
        const relativeSourcePathRaw = path.relative(absolutePackageInstallPath, sourcePackageAbsolutePath);
        const relativeSourcePath = cleanPath(relativeSourcePathRaw);
        // const relativeDestination = path.relative(absolutePackageDestinationPath, absoluteModuleDir);
        console.log(`Linking from '${relativeSourcePath.green}' [${relativeSourcePathRaw.gray}] to '${absolutePackageDestinationPath.yellow}'`)
        fs.symlinkSync(relativeSourcePath, absolutePackageDestinationPath, linkType);

        // mappedPackages[fullPackageName] = {
        //   status: 'mapped',
        //   ...sourcePackageInfo,
        //   splitPackageName,
        //   packageName,
        //   fullPackageName,
        //   absolutePackageInstallPath,
        //   linkType,
        //   relativeSourcePath: {
        //     clean: relativeSourcePath,
        //     raw: relativeSourcePathRaw,
        //   },
        //   absolutePackageDestinationPath: {
        //     clean: absolutePackageDestinationPath,
        //     raw: absolutePackageDestinationPathRaw,
        //   },
        // }
      }


      console.log(`All done, creating [${symlinkPackagesToRemapKeys.length.toString().green}] symlinks`);

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

      fs.writeJSONSync(absoluteControlFilePath, newContorlOptons, { spaces: 2 })

      if (workingDirChanged) {
        const newWorkingDir = path.relative(absoluteModuleDir, currentDirectory);
        console.log(`Changing working directory back to: ${newWorkingDir.green} [${currentDirectory.gray}]`);
        process.chdir(newWorkingDir);
      }

      return symlinkPackagesToRemap;
    } catch (err) {
      console.error(`${'Error occurred'.red}:  ${err}`);
      throw err;
    }

  })

}
