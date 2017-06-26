import 'colors';
import chalk = require('chalk');
import fs = require('fs-extra-promise');
import path = require('path');

import { unquote } from './unquote';

import { GlobalLogger as _log  } from './logger';

export async function getChangeDirectoryToWithThrow(changeDirTo: string[], startingDirectory: string): Promise<string> {
  if (changeDirTo) {
    if (changeDirTo.length < 1) {
      const msg = `${'Error:'.red}  option '${'--cd'.red}' must be followed by a relative or absolute path.`;
      _log.error(msg)
      throw new Error(msg.strip);
    } else {
      const rawDir = changeDirTo[0];
      const inputDir = unquote(rawDir);
      const isInputChangeDirectoryRelative = !path.isAbsolute(inputDir);
      const absoluteChangeDirectoryTo = path.resolve(startingDirectory, inputDir);
      try {

        if (await fs.existsAsync(absoluteChangeDirectoryTo)) {
          _log.info(`Changing working directory to '${inputDir.yellow}'`);
          return absoluteChangeDirectoryTo;

        } else {
          const msg = `${'Cannot change directory to:'.red}  '${inputDir.black.bgWhite}', please ensure it exists${isInputChangeDirectoryRelative ? `, absolutePath '${absoluteChangeDirectoryTo.black.bgWhite}', currentDirectory: ${startingDirectory.black.bgWhite}'` : ''}`;
          _log.error(msg)
          throw new Error(msg.strip);
        }
      } catch (err) {
        const msg = `${'Cannot change directory to:'.red}  '${inputDir.black.bgWhite}', please ensure it exists${isInputChangeDirectoryRelative ? `, absolutePath '${absoluteChangeDirectoryTo.black.bgWhite}', currentDirectory: ${startingDirectory.black.bgWhite}'` : ''}; Error: ${chalk.red(err)}`;
        _log.error(msg)
        throw new Error(msg.strip);
      }
    }
  } else {
    return startingDirectory
  }
}
