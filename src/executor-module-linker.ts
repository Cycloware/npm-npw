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

  const commandsResult = commands.processCommands(argsIn);
  const { actionsMatched, args: { toPass: argsToPass, toPassLead: argsToPassLead, toPassAdditional: argsToPassAdditional } } = commandsResult;

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

  type TPackageToRemapHeader = { packageName: string, rawValue: string };
  type TPackageToRemap = TPackageToRemapHeader & { strippedValue: string, relativePath: string, absolutePath: string };
  const symlinkPackagesToRemap: TIndexerTo<TPackageToRemap> = {};
  const badSymlinkPackagesToRemap: TIndexerTo<TPackageToRemapHeader> = {};

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

  const filePrefix = 'file:';
  for (const packageName in packagesToInclude) {
    const value = packagesToInclude[packageName];
    if (value.startsWith(filePrefix)) {
      const relativePath = value.slice(filePrefix.length);
      pathMod.posix.normalize
      const absolutePackagePath = path.resolve(absoluteBaseDir, relativePath);
      symlinkPackagesToRemap[packageName] = {
        packageName,
        rawValue: value,
        strippedValue: relativePath,
        relativePath,
        absolutePath: absolutePackagePath,
      }
    } else {
      badSymlinkPackagesToRemap[packageName] = {
        packageName,
        rawValue: value,
      }
    }
  }

  const badSymlinkPackagesToRemapKeys = Object.keys(badSymlinkPackagesToRemap);
  if (badSymlinkPackagesToRemapKeys.length > 0) {
    console.warn(`${'BAD SymlinkPackagesToRemap'.red} ${`package paths must start with '${filePrefix.green}'`}: ${_.values(badSymlinkPackagesToRemap).map(x => `${x.packageName.gray}: ${x.rawValue.yellow}`).join('; ')}`);
  }

  const symlinkPackagesToRemapKeys = Object.keys(symlinkPackagesToRemap);
  if (symlinkPackagesToRemapKeys.length > 0) {
    console.log(`${'symlinkPackagesToRemap'.blue} [${symlinkPackagesToRemapKeys.length}]: ${_.values(symlinkPackagesToRemap).map(x => `${x.packageName.gray}: ${x.rawValue.yellow}`).join('; ')}`);
  }
  else {
    console.log(`No ${'symlinkPackagesToRemap'.yellow} to map.`);
    return Promise.resolve(0);
  }

  return fs.existsAsync(absoluteModuleDir).then(doesExist => {
    if (doesExist) {
      return null;
    } else {
      console.log(`Creating absoluteModuleDir: ${absoluteModuleDir.yellow}`);
      return fs.mkdirAsync(absoluteModuleDir).tapCatch(err => console.error(`Failed to mkdir '${absoluteBaseDir.red}'. Err: ${chalk.gray(err)}`));
    }
  }).then(res => {

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

      type TPackagePath = { clean: string, raw: string };

      type TPackageMapped = TPackageToRemap & {
        splitPackageName: string[], packageName: string, fullPackageName: string, absolutePackageInstallPath: string,
        linkType: string, relativeSourcePath: TPackagePath, absolutePackageDestinationPath: TPackagePath,
      }
      const mappedPackages: { [key: string]: TPackageMapped } = {};

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

          try {
            const stats = fs.statSync(absolutePackageInstallPath);
          }
          catch (err) {
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

        mappedPackages[fullPackageName] = {
          ...sourcePackageInfo,
          sectionName,
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


      console.log(`All done, creating [${symlinkPackagesToRemapKeys.length.toString().green}] symlinks`);

      const mappedPackagesKeys = Object.keys(mappedPackages);

      type IControlFileOptions = typeof newContorlOptons;

      const newContorlOptons = {
        package: thisPackageName,
        version: thisPackageVersion,

        pathLib,
        pathSeperatorBad,
        pathSeperatorGood,
        linkType,

        absoluteBaseDir,
        currentDirectory,

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
