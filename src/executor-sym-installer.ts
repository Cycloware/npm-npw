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

import { GlobalLogger as _log, IMessageLogger, changeGlobalLogger, IMessages, buildMessagesCore } from './logger';

import { stringComparer } from './stringComparer';


import { ThisPackage } from './thisPackage';


type TPackageToRemapHeader = { fullPackageName: string, rawValue: string };
type TPackageToRemap = TPackageToRemapHeader & {
  packageName: string, splitPackageName: string[], packageDestinationInModules: TPath, relativeSourcePath: TPath, absoluteSourcePath: TPath,
  ensurePackageInstallPathPresent: boolean, packageInstallHardFolderPath: string, absolutePackageInstallPath: string, relativePackageInstallPath: string,
  absoluteLinkToSourcePath: TPath, relativeLinkToSourcePath: TPath, absolutePackageDestinationPath: TPath, linkType: string,
}

type TPath = { clean: string, raw: string }

type KSourceChecks = 'source-not-directory' | 'source-not-found' | 'source-stat-error' | 'source-unhandled-error';
type TPackageSourceValidationGood = {
  status: 'source-not-checked' | 'source-valid',
}

type TPackageSourceValidationError = {
  status: KSourceChecks,
  errorMessage: string,
}
type TPackageSourceValidation = TPackageSourceValidationError | TPackageSourceValidationGood;
type TPackageMappedCore = TPackageToRemap & IMessages & {
  sourceValidation: TPackageSourceValidation,
  existing?: {
    linkTarget: TPath,
    absoluteLinkTarget: TPath,
    caseSensitive: boolean,

    existingMatch: boolean,

    existingDiffersByCase?: boolean,
  },
}
type TPackageMappedGood = TPackageMappedCore & {
  status: 'mapped-fresh' | 'exists' | 'mapped-recreate',

}
type TPackageMappedError = TPackageMappedCore & IMessages.WithError & {
  status: 'error',
  statusSub: 'other' | 'exist-not-symlink' | 'read-existing-symlink' |
  'remove-existing-symlink' | 'get-stat-info' | 'creating-symlink' |
  'removing-invalid-source' | KSourceChecks,
}

type TPackageMapped = (TPackageMappedGood | TPackageMappedError);


export async function moduleLinker(exec: { commandText: string, argsIn?: string[], argsAsIs?: string[], argsToNpm?: string[] }): Promise<any> {

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
    _log.info(
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
  let validateSourcesExist = true;
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

    _log.trace(` + File paths: ${pathLib.blue}`);
  } else if (pathMod.posix === path) {
    pathLib = 'POSIX';
    pathI = pathMod.posix;
    _log.trace(` + File paths: ${pathLib.blue}`);
  } else {
    _log.trace(` + File paths: ${pathLib.red}`);
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
  _log.trace(` + Case-Sensitive Paths: ${caseSensitive ? 'true'.red : 'false'.blue}`)

  const absolutePackagePath = path.resolve(absoluteBaseDir, packageFilename);

  async function getPackageInfo(packagePath: string): Promise<{ success: true, packageInfo: any } | { success: false, err: any, message: string }> {
    try {
      return { success: true, packageInfo: await fs.readJSONAsync(packagePath) };
    }
    catch (err) {
      return { success: false, err, message: `Error loading package.json '${packagePath.gray}'; err: ${ch.gray(err)}` }
    }
  }

  const packageResult = await getPackageInfo(absolutePackagePath);
  if (packageResult.success === false) {
    _log.error(packageResult.message)
    throw new Error(packageResult.message.strip);
    // return Promise.reject(packageResult.message);
  }

  const packagesToLink: TPackageToRemap[] = [];
  const packagesThatCantLink: TPackageToRemapHeader[] = [];

  const sectionName = 'cw:linkModules';
  const sectionOptionsName = 'cw:linkModules:options'
  const { packageInfo } = packageResult;
  const packagesToInclude: TIndexerToString = packageInfo[sectionName];
  if (typeof packagesToInclude !== 'object') {
    const mes = `No section '${sectionName.yellow}' in package.json`;
    _log.error(mes);
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
        // return Promise.reject(msg.strip);
        throw new Error(msg.strip);
      }
    }
  }
  const absoluteModuleDir = path.resolve(absoluteBaseDir, moduleTarget);
  const relativeModuleDir = path.relative(absoluteBaseDir, absoluteModuleDir);
  const currentDirectory = process.cwd();
  _log.trace(` + moduleTarget: ${moduleTarget.blue}`)
  _log.trace(` + absoluteBaseDir: ${absoluteBaseDir.blue}`);
  _log.trace(` + absoluteModuleDir: ${absoluteModuleDir.blue}`);
  _log.trace(` + currentDirectory: ${currentDirectory.blue}`);

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
      })
    } else {
      packagesThatCantLink.push({
        fullPackageName,
        rawValue: value,
      });
    }
  }

  if (packagesThatCantLink.length > 0) {
    _log.warn(` + ${'BAD packagesThatCantLink'.red} ${`package paths must start with '${filePrefix.green}'`}: ${packagesThatCantLink.map(x => `${x.fullPackageName.gray}: ${x.rawValue.yellow}`).join('; ')}`);
  }

  if (packagesToLink.length > 0) {
    _log.trace(ch.gray(`${' + packagesToLink'.white} [${ch.white(packagesToLink.length)}]: ${packagesToLink.map(x => `${x.fullPackageName.yellow} [${x.rawValue.white}]`).join(', ')}`));
  }
  else {
    _log.warn(` + No ${'packagesToLink'.yellow} to map.`);
    return 0;
  }

  const packagesToLinkKeys = packagesToLink.map(x => x.fullPackageName);

  type TPackageInstallPath = {
    name: string,
    type: string,
    absolutePackageInstallPath: string;
    relativePackageInstallPath: string;
    dependantPackages: string[];
  };

  const moduleDirInstallInfo = { name: moduleTarget, type: 'Link Module Directory', absolutePackageInstallPath: absoluteModuleDir, relativePackageInstallPath: relativeModuleDir, dependantPackages: packagesToLinkKeys };

  const groupedPackagesNeedingInstallPath = _.groupBy(packagesToLink.filter(x => x.ensurePackageInstallPathPresent), x => x.packageInstallHardFolderPath);
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

  async function ensureInstallPathPresent(install: TPackageInstallPath): Promise<TInstallPathResult> {
    const messages = buildMessagesCore();
    const core: TInstallPathCore = { install, messages, }
    try {
      const { absolutePackageInstallPath, relativePackageInstallPath, dependantPackages, name, type } = install;
      messages.info(ch.gray(`${'Ensure Exists'.white}: ${relativePackageInstallPath.yellow} [${type}]`));
      messages.trace(ch.gray(` -- absolutePackageInstallPath: [${absolutePackageInstallPath.gray}] allowLinksInPackageInstallPath: [${allowLinksInPackageInstallPath ? 'true'.red : 'false'.yellow}] DependantPackages: ${dependantPackages}`))
      const stats = await getStatInfo.Async(absolutePackageInstallPath, allowLinksInPackageInstallPath)
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
        await fs.mkdirAsync(absolutePackageInstallPath);
        messages.trace(ch.gray(` -- ${'creating directory'.blue}: ${relativePackageInstallPath.yellow}`))
        try {
          messages.trace(ch.gray(` -- ${'created directory'.green}: ${relativePackageInstallPath.yellow}`))
          return {
            status: 'create',
            ...core,
          } as TInstallPathGood;

        } catch (err) {
          const ret: TInstallPathError = {
            status: 'error',
            errorMessage: ch.gray(` -- ${'error creating directory'.red}: ${relativePackageInstallPath.yellow}; err: ${ch.gray(err)}; DependantPackages: ${dependantPackages.toString().gray}`),
            ...core,
          };
          return ret;
        }
      } else {
        const ret: TInstallPathError = {
          status: 'error',
          errorMessage: ` -- ${'Other error while trying to make install path for: '.red} ${name.yellow}; err: ${ch.gray(stats.errorObject)}; DependantPackages: ${dependantPackages.toString().gray}`,
          ...core,
        };
        return ret;
      }
    } catch (err) {
      const ret: TInstallPathError = {
        status: 'error',
        errorMessage: ` -- ${'Unhandled error while trying to make install path for: '.red} ${install ? install.name : 'Unknown'}; err: ${ch.gray(err)}`,
        ...core,
      };
      return ret;
    }
  }

  function printMessages(input: IMessages.WithPossibleError) {
    if (input) {
      const { messages, errorMessage } = input;
      if (messages) {
        const { items } = messages;
        if (items && items.length > 0) {
          for (const item of items) {
            _log[item.type](item.msg);
          }
        }
      }
      if (errorMessage) {
        _log.error(errorMessage);
      }
    }
  }

  const res = await ensureInstallPathPresent(moduleDirInstallInfo);
  printMessages(res);
  if (res.status === 'error') {
    throw new Error(ch.stripColor(res.errorMessage));
  }

  if (ensureInstallPathsPresent.length > 0) {
    const res = await Promise.all(ensureInstallPathsPresent.map(x => ensureInstallPathPresent(x)));
    res.forEach(p => printMessages(p));
    const errorInstallPaths: TInstallPathError[] = res.filter(p => p.status === 'error') as any;
    if (errorInstallPaths.length > 0) {
      throw new Error(ch.stripColor(`Package Install Paths failed for:
  ${errorInstallPaths.map(p => p.errorMessage).join('  \n')}`));
    }
  }

  _log.info('');

  return await ChangeDirectory.Async({
    absoluteNewCurrentDirectory: absoluteModuleDir
  }, async (state) => {
    try {

      const absoluteControlFilePath = path.resolve(absoluteModuleDir, controlFilename);
      let currentControlRawData: IControlFileOptions;
      try {
        currentControlRawData = await fs.readJsonAsync(absoluteControlFilePath);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          _log.warn(` + ${'FAILED:  '.red} to open control file '${controlFilename.yellow}' at '${absoluteModuleDir.gray}.  Err: ${ch.gray(err)}`);
        }
      }

      function parseControlFileOptions() {
        try {

          const { when, name, version } = currentControlRawData;
          if (name !== ThisPackage.name) {
            return {
              status: 'error' as 'error',
              errorMessage: ` ** ${'Current Control File Error'.red} unknown value for ${'name'.blue}, expected '${ThisPackage.name.green} got '${name.red}' [${controlFilename.gray}]`,
            }
          }

          const { installedPackages, toLinkPackages } = currentControlRawData;

          // packagesLinked
          // const installedPackages

          return {
            status: 'good' as 'good',
            data: {
              installedPackages,
              toLinkPackages,
              allData: currentControlRawData,
            },
          }
        } catch (err) {
          return {
            status: 'error' as 'error',
            errorObject: err,
            errorMessage: ` ** ${'Error parsing current control file'.red} ${controlFilename.gray}`,
          }
        }
      }
      const controlOptionsParsed = parseControlFileOptions();
      if (controlOptionsParsed.status === 'good') {
        const { data: _data } = controlOptionsParsed;
        async function processPreviousControlFile(data: typeof _data) {
          const { installedPackages: { linked: installedPackagesLinked, error: installedPackagesError }, toLinkPackages: { linked: toLinkPackages } } = data;

          const lastErroredPackages = _.keyBy(installedPackagesError, x => x.fullPackageName);

          const installedPackagesToRemove = _.differenceWith(toLinkPackages, packagesToLink, (x, y) => x.fullPackageName !== y.fullPackageName);
          const installedPackagesToRemoveFullPackageNames = installedPackagesToRemove.map(x => x.fullPackageName);

          // if (installedPackagesToRemove.length > 0) {
          //   _log.info(ch.gray(`${'Ensure Exists'.white}: ${relativePackageInstallPath.yellow} [${type}]`));
          //   _log.trace(ch.gray(` -- absolutePackageInstallPath: [${absolutePackageInstallPath.gray}] allowLinksInPackageInstallPath: [${allowLinksInPackageInstallPath ? 'true'.red : 'false'.yellow}] DependantPackages: ${dependantPackages}`))
          // } else {
          //   _log.trace(ch.gray(``))
          // }
        }
      } else {
        controlOptionsParsed.errorMessage;
      }

      async function linkModuleAsync(info: TPackageToRemap): Promise<TPackageMapped> {
        const { packageName, fullPackageName, absoluteLinkToSourcePath, relativeLinkToSourcePath,
          packageInstallHardFolderPath, absolutePackageInstallPath, absoluteSourcePath,
          absolutePackageDestinationPath, packageDestinationInModules, relativeSourcePath } = info;

        const messages = buildMessagesCore();
        const core: TPackageMappedCore = {
          ...info, messages,
          sourceValidation: {
            status: 'source-not-checked',
          }
        }

        if (validateSourcesExist) {
          async function sourceValidator() {
            try {
              const statsSource = await getStatInfo.Async(absoluteSourcePath.clean, false);
              if (statsSource.result === 'stat-returned') {
                if (statsSource.isDirectory) {
                  const ret: TPackageSourceValidationGood = {
                    status: 'source-valid'
                  }
                  return ret;
                } else {
                  const ret: TPackageSourceValidationError = {
                    status: 'source-not-directory',
                    errorMessage: ` -- ${'Source location exists but is not a directory: '.red} ${fullPackageName.yellow}; Source: ${relativeSourcePath.clean.red} [${absoluteSourcePath.clean.gray}]; Stat: [${JSON.stringify(statsSource, null, 1).gray}]`,
                  }
                  return ret;
                }
              } else if (statsSource.result === 'not-found') {
                const ret: TPackageSourceValidationError = {
                  status: 'source-not-found',
                  errorMessage: ` -- ${'Source location was not found: '.red} ${fullPackageName.yellow}; Source: ${relativeSourcePath.clean.red} [${absoluteSourcePath.clean.gray}]`,
                }
                return ret;
              } else {
                const ret: TPackageSourceValidationError = {
                  status: 'source-stat-error',
                  errorMessage: ` -- ${'Other error from getStatInfo: '.red} ${fullPackageName.yellow}; Source: ${relativeSourcePath.clean.red} [${absoluteSourcePath.clean.gray}]; Err: [${ch.gray(statsSource.errorObject)}]`,
                }
                return ret;
              }
            } catch (err) {
              const ret: TPackageSourceValidation = {
                status: 'source-unhandled-error',
                errorMessage: ` -- ${'Unhandled error validating source: '.red} ${fullPackageName.yellow}; Source: ${relativeSourcePath.clean.red} [${absoluteSourcePath.clean.gray}]; err: [${ch.gray(err)}]`,
              }
              return ret;
            }
          }
          core.sourceValidation = await sourceValidator();
        }

        const { sourceValidation: _sv } = core;
        const _sv_status = _sv.status;
        let sourceValidationError: TPackageSourceValidationError;
        if (!(_sv_status === 'source-valid' || _sv_status === 'source-not-checked')) {
          sourceValidationError = _sv as TPackageSourceValidationError
        }

        if (sourceValidationError) {
          messages.warn(ch.white(`${`Symlink`.red} [${_sv_status.red}]:  ${fullPackageName.yellow} -> ${relativeSourcePath.clean.red}`));
        } else {
          messages.info(ch.white(`${'Symlink'.white}:  ${fullPackageName.yellow} -> ${relativeSourcePath.clean.gray}`));
        }

        // messages.trace(ch.gray(` -- absolutePackageInstallPath: [${absolutePackageInstallPath.gray}] allowLinksInPackageInstallPath: [${allowLinksInPackageInstallPath ? 'true'.red : 'false'.yellow}] DependantPackages: ${dependantPackages}`))
        try {
          const stats = await getStatInfo.Async(absolutePackageDestinationPath.clean, false)
          if (sourceValidationError) {
            if ((stats.result === 'stat-returned') && (stats.isSymbolicLink)) {
              try {
                messages.warn(ch.gray(` -- ${'removing target symlink'.red} becuase of source error ${sourceValidationError.status.red}, please validate source exists relative at: ${relativeSourcePath.clean.red} [${absoluteSourcePath.clean.gray}]`));
                const resDel = await del(absolutePackageDestinationPath.clean);
                const ret: TPackageMappedError = {
                  status: 'error',
                  statusSub: sourceValidationError.status,
                  errorMessage: sourceValidationError.errorMessage,
                  ...core,
                };
                return ret;
              } catch (err) {
                const ret: TPackageMappedError = {
                  status: 'error',
                  statusSub: 'removing-invalid-source',
                  errorMessage: ` -- ${`Unhandled exception while removing invalid source at [${sourceValidationError.status.white}]:`.red} ${relativeSourcePath.clean.red} [${absoluteSourcePath.clean.gray}]; Err: ${ch.gray(err)}`,
                  ...core,
                };
                return ret;
              }
            } else {
              const ret: TPackageMappedError = {
                status: 'error',
                statusSub: sourceValidationError.status,
                errorMessage: sourceValidationError.errorMessage,
                ...core,
              };
              return ret;
            }
          }

          async function createSymLink(operationStatus: 'mapped-recreate' | 'mapped-fresh', operationDescription: string) {
            try {
              messages.info(ch.gray(` -- ${'linking'.green} ${fullPackageName.yellow} with '${operationDescription}' as '${linkType.blue}' from '${relativeSourcePath.clean.green}' [${absoluteSourcePath.clean.gray}] to '${packageDestinationInModules.clean.green}' [${absolutePackageDestinationPath.clean.gray}]`))

              await fs.symlinkAsync(relativeLinkToSourcePath.clean, absolutePackageDestinationPath.clean, linkType);
              messages.info(ch.gray(` -- ${'LINKED'.green}'`));
              const ret: TPackageMappedGood = {
                status: operationStatus,
                ...core,
              };
              return ret;
            } catch (err) {
              const ret: TPackageMappedError = {
                status: 'error',
                statusSub: 'creating-symlink',
                errorMessage: `${' -- Error creating symlink: '.red} with '${operationDescription}' as '${linkType.blue}' from '${relativeSourcePath.clean.green} [${absoluteSourcePath.clean.gray}]; Err: ${ch.gray(err)}`,
                ...core,
              };
              return ret;
            }
          }

          if (stats.result === 'stat-returned') {
            if (stats.isSymbolicLink) {

              try {
                messages.trace(ch.gray(` -- install path ${'already a symlink'.blue}, ${'will check expected target'.yellow}: [${relativeLinkToSourcePath.clean.white}]`));
                const res = await fs.readlinkAsync(absolutePackageDestinationPath.clean)
                const existingLinkTarget = cleanPathObj(res);

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
                  try {
                    const resDel = await del(absolutePackageDestinationPath.clean);

                    return await createSymLink('mapped-recreate', 'recreate'.red);
                  } catch (err) {
                    const ret: TPackageMappedError = {
                      status: 'error',
                      statusSub: 'remove-existing-symlink',
                      errorMessage: ` -- ${'Error removing existing symlink for: '.red} ${fullPackageName.yellow} [${absolutePackageDestinationPath.clean.gray}]; Err: ${ch.gray(err)}`,
                      ...core,
                    };
                    return ret;
                  }
                }
              } catch (err) {
                const ret: TPackageMappedError = {
                  status: 'error',
                  statusSub: 'read-existing-symlink',
                  errorMessage: ` -- ${'Error readlinkAsync for: '.red} ${fullPackageName.yellow} [${absolutePackageDestinationPath.clean.gray}]; Err: ${ch.gray(err)}`,
                  ...core,
                };
                return ret;
              }
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
            if (sourceValidationError) {
              try {
                messages.trace(ch.gray(` -- ${'removing target symlink'.red} becuase of source error ${sourceValidationError.status.red}, please validate source exists relative at: ${relativeSourcePath.clean.red} [${absoluteSourcePath.clean.gray}]`));
                const resDel = await del(absolutePackageDestinationPath.clean);
                const ret: TPackageMappedError = {
                  status: 'error',
                  statusSub: sourceValidationError.status,
                  errorMessage: sourceValidationError.errorMessage,
                  ...core,
                };
                return ret;
              } catch (err) {
                const ret: TPackageMappedError = {
                  status: 'error',
                  statusSub: 'removing-invalid-source',
                  errorMessage: ` -- ${`Unhandled exception while removing invalid source at [${sourceValidationError.status.white}]:`.red} ${relativeSourcePath.clean.red} [${absoluteSourcePath.clean.gray}]; Err: ${ch.gray(err)}`,
                  ...core,
                };
                return ret;
              }
            }
            return await createSymLink('mapped-recreate', 'recreate'.red);
          } else {
            const ret: TPackageMappedError = {
              status: 'error',
              statusSub: 'other',
              errorMessage: ` -- ${'Other error from getStatInfo: '.red} ${fullPackageName.yellow}; Location [${absolutePackageDestinationPath.clean.gray}]; Err: [${ch.gray(stats.errorObject)}]`,
              ...core,
            };
            return ret;
          }
        }
        catch (err) {
          const ret: TPackageMappedError = {
            status: 'error',
            statusSub: 'get-stat-info',
            errorMessage: ` -- ${'Error getStatInfo for: '.red} ${fullPackageName.yellow} [${absolutePackageDestinationPath.clean.gray}]; Err: ${ch.gray(err)}`,
            ...core,
          };
          return ret;
        }
      }

      const res = await Promise.all(packagesToLink.map(val => linkModuleAsync(val)))

      const installedPackages = {
        linked: res.filter(p => p.status !== 'error'),
        error: res.filter(p => p.status === 'error'),
      };

      const toLinkPackages = {
        linked: packagesToLink,
        error: packagesThatCantLink,
      };

      res.forEach(p => printMessages(p));

      _log.info('');
      {
        const { linked, error, } = installedPackages;
        const totalPackageCount = linked.length + error.length;
        const colorToUse = linked.length > 0 ? (error.length > 0 ? ch.yellow : ch.green) : ch.red;

        _log.warn(`*** ${colorToUse(totalPackageCount).underline} total packages:`)
        if (linked.length > 0) {
          _log.warn(` -- ${ch.green(linked.length)} packages ${'linked'.green}.`);
        }
        if (error.length > 0) {
          _log.error(` -- ${ch.red(error.length)} packaged ${'failed'.red}.`);
        }
        _log.warn('');

        const errors: TInstallPathError[] = res.filter(p => p.status === 'error') as any;
        if (errors.length > 0) {
          const msg = (`${'***'.red} linkModules ${'failed'.red} (${`${errors.length.toString()} error(s)`.red}):
${errors.map((p, dex) => `  ${`${dex + 1}]`.red} ${p.errorMessage.trim()}`).join('  \n')}`);
          _log.error(msg);
        }

        if (linked.length === 0 && error.length === 0) {
          _log.warn(`No packaged were linked!`.yellow);
        }
      }
      type IControlFileOptions = typeof newControlFileOptions;

      const newControlFileOptions = {
        when: new Date().toString(),
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
        absoluteControlFilePath,

        absolutePackagePath,
        packageFilename,

        rebuild,

        installedPackages,
        toLinkPackages
      }

      try {
        await fs.writeJSONAsync(absoluteControlFilePath, newControlFileOptions, { spaces: 2 });
      } catch (err) {
        _log.error(`${'Error writing control file'.red}: ${absoluteControlFilePath}; err: ${ch.gray(err)}`)
      }
      return newControlFileOptions;

    } catch (err) {
      _log.error(`${'Unhandled Error occurred'.red}: ${ch.gray(err)}`);
      throw err;
    }
  })

}
