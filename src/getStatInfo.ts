import 'colors';
import ch = require('chalk');

import fs = require('fs-extra-promise');

export namespace getStatInfo {

  export import Stats = fs.Stats;

  export type TResultError = {
    result: 'not-found' | 'error',
    path: string,
    message: string,
    errorObject: any,
  }

  export type TResultGood = {
    result: 'stat-returned',
    path: string,
    resolveLinks: boolean,
    resolvedLink?: TInfo,
  } & TInfo;

  export type TInfo = {
    isDirectory: boolean,
    isFile: boolean,
    isSymbolicLink: boolean,

    type: 'file' | 'directory' | 'symlink' | 'unknown',

    stat: 'lstat' | 'stat',
    statRet: Stats,
  }

  export type TResult = TResultGood | TResultError;

  function processError(path: string, err: any, stage: string) {
    const result = ((err.code === 'ENOENT') ? 'not-found' : 'error') as ('not-found' | 'error');
    let message;
    if (result === 'not-found') {
      message = `File path '${path} not found [${stage}].`;
    } else {
      message = `Other error occured [${stage}]; err: ${err}.`;
    }
    return {
      result,
      message,
      path,
      errorObject: err,
    }
  }

  function infoFromStats(statType: 'lstat' | 'stat', statRet: Stats): TInfo {
    const isSymbolicLink = statRet.isSymbolicLink();
    const isFile = statRet.isFile();
    const isDirectory = statRet.isDirectory();
    return {
      isDirectory,
      isFile,
      isSymbolicLink,
      type: isDirectory ? 'directory' : isFile ? 'file' : isSymbolicLink ? 'symlink' : 'unknown',
      stat: statType,
      statRet,
    }
  }

  export async function Async(path: string, resolveLinks: boolean): Promise<TResult> {
    try {
      const lstatRet = await fs.lstatAsync(path)
      const resultRet: TResultGood = {
        result: 'stat-returned',
        path,
        ...infoFromStats('lstat', lstatRet),
        resolveLinks,
      }
      if (resolveLinks && lstatRet.isSymbolicLink) {
        try {
          const statRet = await fs.statAsync(path)
          resultRet.resolvedLink = infoFromStats('stat', statRet);
        } catch (err) {
          return processError(path, err, '2-stat-link-resolve')
        }
      }
      return resultRet;
    } catch (err) {
      return processError(path, err, '1-lstat')
    }
  }

  export function Sync(path: string, resolveLinks: boolean): TResult {

    try {
      const lstatRet = fs.lstatSync(path);
      const resultRet: TResultGood = {
        result: 'stat-returned',
        path,
        ...infoFromStats('lstat', lstatRet),
        resolveLinks,
      };

      if (resolveLinks && resultRet.isSymbolicLink) {
        try {
          const statRet = fs.statSync(path);
          resultRet.resolvedLink = infoFromStats('stat', statRet);
        } catch (err) {
          return processError(path, err, '2-stat-link-resolve')
        }
      }
      return resultRet;
    } catch (err) {
      return processError(path, err, '1-lstat')
    }
  }
}
