import 'colors';

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

import { getPackageInfo } from './getPackageInfo';
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

type KSourceChecks = 'source-not-directory' | 'source-not-found' | 'source-stat-error' | 'source-unhandled-error' |
  'source-has-no-package-info' | 'source-package-info-error' | 'source-package-has-no-name' | 'source-package-name-mismatch';
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

export async function moduleLinker(exec: { commandText: string, argsIn?: string[], argsAsIs?: string[], argsToNpm?: string[], noHeader?: boolean, noEmptyPackageSectionMessage?: boolean }):
  Promise<any> {

  try {
    let { commandText, argsIn = [], argsAsIs = [], argsToNpm = [], noHeader = false, noEmptyPackageSectionMessage = false } = exec;
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
    let moduleTarget = 'node_modules';
    let moduleTargetSource = 'default';
    let rebuild = false;
    let validateSourcesExist = true;
    let allowLinksInPackageInstallPath = false;
    let caseSensitive = false;
    let deleteTargets = false;
    type DModuleVerfication = 'dafault' | 'full' | 'none'
    let moduleNameVerification: boolean = undefined;
    const packageFilename = 'package.json';

    let uninstall = false;

    const commands = CommandBuilder.Start()
      .command(['--target'],
      ({ taken }) => {
        moduleTarget = unquote(taken[0]);
        moduleTargetSource = 'command';
      }, {
        nArgs: 1,
      })
      .command(['--no-header', '--noheader'], () => {
        noHeader = true;
      })
      .command(['--no-verify', '--verify-none'], () => {
        moduleNameVerification = false;
      })
      .command(['--verify', '--verify-full'], () => {
        moduleNameVerification = true;
      })
      .command(['--rebuild'], () => {
        rebuild = true;
      })
      .command(['--uninstall'], () => {
        uninstall = true;
      })
      .command(['--delete-targets'], () => {
        deleteTargets = true;
      })
      .command(['--quiet'], () => {
        noHeader = true;
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

    if (!noHeader) {
      const titleLine = `${'Cycloware'.blue} ${'Module Linker'.green.bold.italic}`;
      const titleLineLength = ch.stripColor(titleLine).length;
      _log.info(
        `${titleLine}    
${'-'.repeat(titleLineLength).green}
`)
    }

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

    const packageResult = await getPackageInfo(absolutePackagePath)
    if (packageResult.result !== 'success') {
      _log.error(packageResult.message)
      throw new Error(packageResult.message.strip);
    }

    _log.warn('')

    const packagesToLink: TPackageToRemap[] = [];
    const packagesThatCantLink: TPackageToRemapHeader[] = [];

    const sectionName = 'cw:symlinkModules';
    const sectionOptionsName = 'cw:symlinkModules:options'
    const { packageInfo } = packageResult;
    const packagesToInclude: TIndexerToString = packageInfo[sectionName];
    if (typeof packagesToInclude !== 'object') {
      const mes = `No section '${sectionName.yellow}' in package.json`;
      if (!noEmptyPackageSectionMessage) {
        _log.error(mes);
      }
      return mes.strip;
    }

    type TLinkModuleOptions = {
      targetDir: string,
      moduleNameVerification: boolean,
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
          _log.error(msg)
          throw new Error(msg.strip);
        }
      }

      if (moduleNameVerification === undefined) {
        const { moduleNameVerification: _mnv } = linkModuleOptions;
        if (typeof _mnv === 'boolean') {
          moduleNameVerification = _mnv;
        }
      }
    }

    if (moduleNameVerification === undefined) {
      moduleNameVerification = true;
    }


    const absoluteModuleDir = path.resolve(absoluteBaseDir, moduleTarget);
    const relativeModuleDir = path.relative(absoluteBaseDir, absoluteModuleDir);
    const currentDirectory = process.cwd();
    _log.trace(` + moduleTarget: ${moduleTarget.blue}`)
    _log.trace(` + absoluteBaseDir: ${absoluteBaseDir.blue}`);
    _log.trace(` + absoluteModuleDir: ${absoluteModuleDir.blue}`);
    _log.trace(` + currentDirectory: ${currentDirectory.blue}`);

    return await ChangeDirectory.Async({
      absoluteNewCurrentDirectory: absoluteModuleDir
    }, async (state) => {
      try {

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

        const absoluteControlFilePath = path.resolve(absoluteModuleDir, controlFilename);
        let currentControlRawData: IControlFileOptions;
        try {
          currentControlRawData = await fs.readJsonAsync(absoluteControlFilePath);
        } catch (err) {
          if (err.code !== 'ENOENT') {
            const msg = `${'FAILED:  '.red} to open an exsiting control file '${controlFilename.yellow}' at '${absoluteModuleDir.gray}.
          
 *** ${'Delete the file and retry if you want to continue or make sure it is not locked!'.yellow.underline}
  
Err: ${ch.gray(err)}`
            _log.error(msg);
            throw new Error(msg.strip)
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

            const { installedPackages, toLinkPackages, installedPackagesNotRemoved } = currentControlRawData;
            return {
              status: 'good' as 'good',
              data: {
                installedPackages,
                installedPackagesNotRemoved,
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
        let installedPackagesToRemoveFullPackageNames: string[] = [];
        let installedPackagesToRemove: (typeof packagesToLink[-1])[] = [];
        let installedPackagesNotRemoved: (typeof packagesToLink[-1])[] = [];
        if (controlOptionsParsed.status === 'good') {
          try {
            const { data: _data } = controlOptionsParsed;
            async function processPreviousControlFile(data: typeof _data) {
              const {
              toLinkPackages: { linked: existingPackagesToLink },
                installedPackagesNotRemoved: existingPackagesNotRemoved } = data;

              let allInstalledPackagesToRemove = _.unionBy(existingPackagesToLink, existingPackagesNotRemoved, x => x.fullPackageName);
              let installedPackagesToRemoveC = allInstalledPackagesToRemove;
              if (!(rebuild || uninstall)) {
                installedPackagesToRemoveC = _.differenceBy(allInstalledPackagesToRemove, packagesToLink, x => x.fullPackageName);
              }
              installedPackagesToRemoveFullPackageNames = installedPackagesToRemoveC.map(x => x.fullPackageName);

              // if (existingPackagesNotRemoved.length > 0) {
              //   _log.warn(`Retrying to remove`)
              // }

              if (installedPackagesToRemoveC.length > 0) {
                _log.warn(ch.gray(`${'Unlink Packages'.white}: ${`removing ${installedPackagesToRemoveC.length} symlinks`.blue}${rebuild ? ` for rebuild` : uninstall ? ` for uninstall` : ''} [${installedPackagesToRemoveFullPackageNames.map(p => p.yellow).join(', '.white)}]`));

                let needsDeleteTargets = false;
                for (const info of installedPackagesToRemoveC) {
                  const { fullPackageName, relativeSourcePath: { clean: relativeSourcePath = '' },
                    absolutePackageDestinationPath: { clean: absolutePackageDestinationPath = '' } } = info;
                  try {
                    _log.info(ch.gray(` -- ${'removing'.blue} - ${fullPackageName.yellow} -> ${relativeSourcePath.gray}`));
                    const stats = await getStatInfo.Async(absolutePackageDestinationPath, false)
                    if (stats.result === 'stat-returned') {
                      if (!stats.isSymbolicLink && !deleteTargets) {
                        _log.error(`    * cannot remove symlink because target ${'not a symbolic link'.underline.red} it is a ${stats.type.red}, target: ${absolutePackageDestinationPath.gray}.`)
                        _log.trace(`    * stats: [${JSON.stringify(stats, null, 0).gray}]`);
                        installedPackagesNotRemoved.push(info);
                        needsDeleteTargets = true;
                        continue;
                      }
                    } else if (stats.result === 'not-found') {
                      _log.warn(ch.gray(` -- ${"symlink doesn't exist".blue} (${'this is strange but not an error'.white.underline}) - ${fullPackageName.yellow} -> ${relativeSourcePath.gray}`));
                    } else {
                      _log.error(ch.gray(` -- ${"error getting symlik stats".red} - ${fullPackageName.yellow} -> ${relativeSourcePath.gray}`));
                      _log.error(ch.gray(`    * msg:  ${stats.message}; err: ${stats.errorObject}`));
                    }
                    const resDel = await del(absolutePackageDestinationPath);
                    installedPackagesToRemove.push(info);
                  } catch (err) {
                    _log.error(` -- ${'error removing'.red} package '${ch.underline(fullPackageName)}' symlink at '${absolutePackageDestinationPath.gray}'`)
                    installedPackagesNotRemoved.push(info);
                  }
                }

                if (needsDeleteTargets) {
                  _log.error(``);
                  _log.error(`*** To delete targets that are not symlinks run with ${`--delete-targets`.yellow}`.red);
                }

                _log.warn('');
              } else {
                _log.info(ch.gray(`${'Unlink Packages'.white}: ${`nothing to remove`.yellow}`));
                _log.info('');
              }
            }

            await processPreviousControlFile(_data);
          } catch (err) {
            const msg = `${'Error'.red} parsing control file options.  Err: ${err}`;
            _log.error(msg)
            throw new Error(msg.strip);
          }
        } else {
          controlOptionsParsed.errorMessage;
        }

        if (packagesThatCantLink.length > 0) {
          _log.warn(` + ${'BAD packagesThatCantLink'.red} ${`package paths must start with '${filePrefix.green}'`}: ${packagesThatCantLink.map(x => `${x.fullPackageName.gray}: ${x.rawValue.yellow}`).join('; ')}`);
        }

        if (packagesToLink.length > 0) {
          _log.trace(ch.gray(`${' + packagesToLink'.white} [${ch.white(packagesToLink.length)}]: ${packagesToLink.map(x => `${x.fullPackageName.yellow} [${x.rawValue.white}]`).join(', ')}
`));
        }
        else {
          _log.warn(` + No ${'packages to symlink'.yellow}.
`);
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

        const resInstallPaths = await ensureInstallPathPresent(moduleDirInstallInfo);
        printMessages(resInstallPaths);
        if (resInstallPaths.status === 'error') {
          throw new Error(ch.stripColor(resInstallPaths.errorMessage));
        }

        if (ensureInstallPathsPresent.length > 0) {
          const resInstallAllPaths = await Promise.all(ensureInstallPathsPresent.map(x => ensureInstallPathPresent(x)));
          resInstallAllPaths.forEach(p => printMessages(p));
          const errorInstallPaths: TInstallPathError[] = resInstallAllPaths.filter(p => p.status === 'error') as any;
          if (errorInstallPaths.length > 0) {
            throw new Error(ch.stripColor(`Package Install Paths failed for:
  ${errorInstallPaths.map(p => p.errorMessage).join('  \n')}`));
          }
        }

        _log.info('');

        async function linkModuleAsync(info: TPackageToRemap): Promise<TPackageMapped> {
          const { packageName, fullPackageName, absoluteLinkToSourcePath, relativeLinkToSourcePath,
            packageInstallHardFolderPath, absolutePackageInstallPath, absoluteSourcePath,
            absolutePackageDestinationPath, packageDestinationInModules, relativeSourcePath } = info;

          const absoluteSourcePathClean = absoluteSourcePath.clean;

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
                const statsSource = await getStatInfo.Async(absoluteSourcePathClean, false);
                if (statsSource.result === 'stat-returned') {
                  if (statsSource.isDirectory) {
                    if (moduleNameVerification) {
                      const sourcePackageInfoPath = path.join(absoluteSourcePathClean, 'package.json');
                      const resPackageInfo = await getPackageInfo(sourcePackageInfoPath);
                      if (resPackageInfo.result === 'success') {
                        const { packageInfo } = resPackageInfo;
                        if (packageInfo.name) {
                          if (fullPackageName !== packageInfo.name) {
                            const insensitiveMatch = stringComparer.Insensitive(fullPackageName, packageInfo.name);
                            let msg = ` -- Source package name is '${packageInfo.name.red}' and does not match name '${fullPackageName.red}' listed in the section '${sectionName.red}' of package file [${absolutePackagePath.gray}].`;
                            if (insensitiveMatch) {
                              msg += `
    ${'*** names only differ by case ***'.red}`;
                            }
                            const ret: TPackageSourceValidationError = {
                              status: 'source-package-name-mismatch',
                              errorMessage: msg,
                            }
                            return ret;
                          }
                          else {
                            const ret: TPackageSourceValidationGood = {
                              status: 'source-valid'
                            }
                            return ret;
                          }
                        } else {
                          const ret: TPackageSourceValidationError = {
                            status: 'source-package-has-no-name',
                            errorMessage: ` -- ${'No name property'.red} in source package.json file [${sourcePackageInfoPath.grey}].  TargetPackage: ${fullPackageName.yellow}; Source: ${relativeSourcePath.clean.red} [${absoluteSourcePathClean.gray}].`,
                          }
                          return ret;
                        }
                      } else {
                        if (resPackageInfo.result === 'not-found') {
                          const ret: TPackageSourceValidationError = {
                            status: 'source-has-no-package-info',
                            errorMessage: ` -- ${'No package.json file.'.red} in source location directory.  TargetPackage: ${fullPackageName.yellow}; Source: ${relativeSourcePath.clean.red} [${absoluteSourcePathClean.gray}].`,
                          }
                          return ret;
                        } else {
                          const ret: TPackageSourceValidationError = {
                            status: 'source-package-info-error',
                            errorMessage: ` -- ${'Other error'.red} try to read package.json file.  TargetPackage: ${fullPackageName.yellow}; Source: ${relativeSourcePath.clean.red} [${absoluteSourcePathClean.gray}]; err: [${ch.grey(resPackageInfo.err)}]`,
                          }
                          return ret;
                        }
                      }
                    }
                    else {
                      const ret: TPackageSourceValidationGood = {
                        status: 'source-valid'
                      }
                      return ret;
                    }
                  } else {
                    const ret: TPackageSourceValidationError = {
                      status: 'source-not-directory',
                      errorMessage: ` -- ${'Source location exists but is not a directory: '.red} ${fullPackageName.yellow}; Source: ${relativeSourcePath.clean.red} [${absoluteSourcePathClean.gray}]; Stat: [${JSON.stringify(statsSource, null, 1).gray}]`,
                    }
                    return ret;
                  }
                } else if (statsSource.result === 'not-found') {
                  const ret: TPackageSourceValidationError = {
                    status: 'source-not-found',
                    errorMessage: ` -- ${'Source location was not found: '.red} ${fullPackageName.yellow}; Source: ${relativeSourcePath.clean.red} [${absoluteSourcePathClean.gray}]`,
                  }
                  return ret;
                } else {
                  const ret: TPackageSourceValidationError = {
                    status: 'source-stat-error',
                    errorMessage: ` -- ${'Other error from getStatInfo: '.red} ${fullPackageName.yellow}; Source: ${relativeSourcePath.clean.red} [${absoluteSourcePathClean.gray}]; Err: [${ch.gray(statsSource.errorObject)}]`,
                  }
                  return ret;
                }
              } catch (err) {
                const ret: TPackageSourceValidation = {
                  status: 'source-unhandled-error',
                  errorMessage: ` -- ${'Unhandled error validating source: '.red} ${fullPackageName.yellow}; Source: ${relativeSourcePath.clean.red} [${absoluteSourcePathClean.gray}]; err: [${ch.gray(err)}]`,
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
                  messages.warn(ch.gray(` -- ${'removing target symlink'.red} because of source error ${sourceValidationError.status.red}, please validate source exists relative at: ${relativeSourcePath.clean.red} [${absoluteSourcePath.clean.gray}]`));
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
                messages.info(ch.gray(` -- ${'linking'.green} ${fullPackageName.yellow} by ${operationDescription} as '${linkType.blue}' from '${relativeSourcePath.clean.green}' [${absoluteSourcePath.clean.gray}] to '${packageDestinationInModules.clean.green}' [${absolutePackageDestinationPath.clean.gray}]`))

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

                      return await createSymLink('mapped-recreate', 'recreating symlink'.yellow.underline);
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
                  errorMessage: ` -- Target location exists but is ${'not a symbolic link: '.red} it is a ${stats.type.red} ${fullPackageName.yellow}; Location [${absolutePackageDestinationPath.clean.gray}]; Stat: [${JSON.stringify(stats, null, 1).gray}]`,
                  ...core,
                };
                return ret;
              }
            } else if (stats.result === 'not-found') {
              if (sourceValidationError) {
                try {
                  messages.trace(ch.gray(` -- ${'removing target symlink'.red} because of source error ${sourceValidationError.status.red}, please validate source exists relative at: ${relativeSourcePath.clean.red} [${absoluteSourcePath.clean.gray}]`));
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
              return await createSymLink('mapped-fresh', 'creating new symlink'.green.underline);
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

        const res = uninstall ? [] : await Promise.all(packagesToLink.map(val => linkModuleAsync(val)))

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

          if (installedPackagesToRemove.length > 0) {
            _log.warn(`*** ${ch.blue(`${installedPackagesToRemove.length} unused symlinks${rebuild ? ` for rebuild` : uninstall ? ` for uninstall` : ''}`)} removed
`);
          }

          if (totalPackageCount > 0) {
            _log.warn(`*** ${colorToUse(`${totalPackageCount} total`).underline} packages:`)
            if (linked.length > 0) {
              _log.warn(` -- ${ch.green(linked.length)} packages ${'symlinked'.green}.`);
            }
            if (error.length > 0) {
              _log.error(` -- ${ch.red(error.length)} packaged ${'failed'.red}.`);
            }
            _log.warn('');
          }

          const errors: TInstallPathError[] = res.filter(p => p.status === 'error') as any;
          if (errors.length > 0) {
            const msg = (`${'***'.red} symlinkModules ${'failed'.red} (${`${errors.length.toString()} error(s)`.red}):
${errors.map((p, dex) => `  ${`${dex + 1}]`.red} ${p.errorMessage.trim()}`).join('  \n')}`);
            _log.error(msg);
          }

          if (linked.length === 0 && error.length === 0) {
            _log.warn(`*** No packaged were symlinked! ***

`.yellow);
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
          uninstall,

          installedPackages,
          toLinkPackages,

          installedPackagesRemoved: installedPackagesToRemove,
          installedPackagesNotRemoved,
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
  catch (err) {
    _log.error(`${'Unhandled Error occurred - outer'.red}: ${ch.gray(err)}`);
  }

}
