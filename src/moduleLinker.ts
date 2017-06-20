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

export function moduleLinker(exec: { commandText: string, argsIn?: string[], argsAsIs?: string[], argsToNpm?: string[] }): Promise<any> {

  const baseDir = process.cwd();
  const absoluteBaseDir = path.resolve(baseDir);

  const absoluteModuleDir = path.resolve(absoluteBaseDir, 'link_modules');
  const currentDirectory = process.cwd();

  console.log(`absoluteBaseDir: ${absoluteBaseDir.red}`);
  console.log(`absoluteModuleDir: ${absoluteModuleDir.green}`);
  console.log(`currentDirectory: ${currentDirectory.green}`);

  const packagePath = path.resolve('package.json');
  function getPackageInfo(packagePath: string): { success: true, packageInfo: any } | { success: false, err: any, message: string } {
    try {
      return { success: true, packageInfo: require(packagePath) };
    }
    catch (err) {
      return { success: false, err, message: `Error loading package.json '${packagePath.gray}'; err: ${chalk.gray(err)}` }
    }
  }

  const packageResult = getPackageInfo(packagePath);
  if (packageResult.success === false) {
    console.error(packageResult.message)
    return Promise.reject(packageResult.message);
  }

  const symlinkPackagesToRemap: TIndexerTo<{ packageName: string, rawValue: string, strippedValue: string, relativePath: string, absolutePath: string }> = {};
  const badSymlinkPackagesToRemap: TIndexerTo<{ packageName: string, rawValue: string }> = {};

  const sectionName = 'cw:linkModules';
  const { packageInfo } = packageResult;
  const packagesToInclude = packageInfo[sectionName];
  if (typeof packagesToInclude !== 'object') {
    const mes = `No section '${sectionName.yellow}' in package.json`;
    console.info(mes);
    return Promise.reject(mes);
  }
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

      try {
        const stats = fs.statSync(absoluteModuleDir);
      }
      catch (err) {
        fs.mkdirSync(absoluteModuleDir);
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
      }


      console.log(`All done, creating [${symlinkPackagesToRemapKeys.length.toString().green}] symlinks`);

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