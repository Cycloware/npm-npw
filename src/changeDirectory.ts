import * as path from 'path';
import { GlobalLogger, IMessageLogger, changeGlobalLogger, IMessages, buildMessagesCore } from './logger';

import { stringComparer } from './stringComparer';

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

  function performDirectoryChange(_absoluteOldCurrentDirectory: string, _absoluteNewCurrentDirectory: string, _relativeNewCurrentDirectory: string, log: IMessageLogger, traceOutput: boolean) {
    try {
      const relativeOldWorkingDir = path.relative(_absoluteNewCurrentDirectory, _absoluteOldCurrentDirectory);
      if (traceOutput) {
        log.trace(` + Changing Current Directory back: ${relativeOldWorkingDir.green} [${_absoluteNewCurrentDirectory.gray}]`);
      }
      process.chdir(_absoluteOldCurrentDirectory);
    } catch (err) {
      log.error(` + Error Changing Current Directory back: ${_absoluteOldCurrentDirectory.red} [${_absoluteNewCurrentDirectory.gray}]`)
      throw err;
    }
  }
  export type TError = {
    result: 'not-found' | 'error',
    path: string,
    message: string,
    errorObject: any,
  }

  function defaultErrorProcessor(err: any, filepath: string): TError {
    const result = ((err.code === 'ENOENT') ? 'not-found' : 'error') as ('not-found' | 'error');
    let message;
    if (result === 'not-found') {
      message = `Cannot change directory to '${filepath}' because it was not found.`;
    } else {
      message = `Other error occured with changing directory to '${filepath}'; err: ${err}.`;
    }
    return {
      result,
      message,
      path: filepath,
      errorObject: err,
    }

  }


  export async function Async<TResult>(args: {
    absoluteNewCurrentDirectory: string,
    log?: IMessageLogger, currentDirectoryOverride?: string, caseSensitive?: boolean, traceOutput?: boolean,
  }, action: (state?: TState) => Promise<TResult>, errorProcessor: (err: any, filepath: string) => TError = defaultErrorProcessor): Promise<TResult | TError> {

    let directoryWasChanged = false;
    let _absoluteOldCurrentDirectory: string;
    let _absoluteNewCurrentDirectory: string;
    let _relativeNewCurrentDirectory: string;
    let log = GlobalLogger;
    let traceOutput = true;
    try {
      const { absoluteNewCurrentDirectory, currentDirectoryOverride = process.cwd(),
        caseSensitive = true, } = args;
      if (args.traceOutput === false) {
        traceOutput = false;
      }
      if (args.log) {
        log = args.log;
      }

      const comparer = stringComparer.get(caseSensitive);
      const absoluteOldCurrentDirectory = currentDirectoryOverride;
      _absoluteOldCurrentDirectory = absoluteOldCurrentDirectory;
      _absoluteNewCurrentDirectory = absoluteNewCurrentDirectory;

      const directoryShouldChange = !comparer(absoluteNewCurrentDirectory, absoluteOldCurrentDirectory);
      const relativeNewCurrentDirectory = path.relative(absoluteOldCurrentDirectory, absoluteNewCurrentDirectory);
      if (directoryShouldChange) {
        if (traceOutput) {
          log.trace(` + Changing Current Directory: ${relativeNewCurrentDirectory.green} [${absoluteNewCurrentDirectory.gray}]`);
        }
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
      return await action(state);
    } catch (err) {
      return errorProcessor(err, _relativeNewCurrentDirectory);
    } finally {
      if (directoryWasChanged) {
        performDirectoryChange(_absoluteOldCurrentDirectory, _absoluteNewCurrentDirectory, _relativeNewCurrentDirectory, log, traceOutput);
      }
    }
  }
}
