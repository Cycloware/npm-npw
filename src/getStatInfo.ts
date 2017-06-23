import 'colors';
import chalk = require('chalk');
// import * as Promise from 'bluebird';

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

  export async function Async(path: string, resolveLinks: boolean): Promise<TResult> {
    try {
      const lstatRet = await fs.lstatAsync(path)
      const isSymbolicLink = lstatRet.isSymbolicLink();
      const resultRet: TResultGood = {
        result: 'stat-returned',
        path,
        isDirectory: lstatRet.isDirectory(),
        isFile: lstatRet.isFile(),
        isSymbolicLink,
        resolveLinks,

        stat: 'lstat',
        statRet: lstatRet,
      }
      if (resolveLinks && isSymbolicLink) {
        try {
          const statRet = await fs.statAsync(path)
          resultRet.resolvedLink = {
            isDirectory: statRet.isDirectory(),
            isFile: statRet.isFile(),
            isSymbolicLink: statRet.isSymbolicLink(),

            stat: 'stat',
            statRet

          }
          return resultRet;
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
        isDirectory: lstatRet.isDirectory(),
        isFile: lstatRet.isFile(),
        isSymbolicLink: lstatRet.isSymbolicLink(),
        resolveLinks,

        stat: 'lstat',
        statRet: lstatRet,
      };

      if (resolveLinks && resultRet.isSymbolicLink) {
        try {
          const statRet = fs.statSync(path);
          resultRet.resolvedLink = {
            isDirectory: statRet.isDirectory(),
            isFile: statRet.isFile(),
            isSymbolicLink: statRet.isSymbolicLink(),

            stat: 'stat',
            statRet
          }
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
