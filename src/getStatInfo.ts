import 'colors';
import chalk = require('chalk');
import * as Promise from 'bluebird';

import fs = require('fs-extra-promise');


export namespace getStatInfo {

  export import Stats = fs.Stats;

  export type TResultError = {
    result: 'not-found' | 'error',
    path: string,
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

  export function Async(path: string, resolveLinks: boolean): Promise<TResult> {
    return fs.lstatAsync(path).then(lstatRet => {
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
        return fs.statAsync(path).then(statRet => {
          resultRet.resolvedLink = {
            isDirectory: statRet.isDirectory(),
            isFile: statRet.isFile(),
            isSymbolicLink: statRet.isSymbolicLink(),

            stat: 'stat',
            statRet

          }
          return resultRet;
        })

      }
      return resultRet;
    }).catch(err => {
      return {
        result: ((err.code === 'ENOENT') ? 'not-found' : 'error') as ('not-found' | 'error'),
        path,
        errorObject: err,
      }
    })
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
        const statRet = fs.statSync(path);
        resultRet.resolvedLink = {
          isDirectory: statRet.isDirectory(),
          isFile: statRet.isFile(),
          isSymbolicLink: statRet.isSymbolicLink(),

          stat: 'stat',
          statRet
        }
      }
      return resultRet;
    } catch (err) {
      return {
        result: ((err.code === 'ENOENT') ? 'not-found' : 'error') as ('not-found' | 'error'),
        path,
        errorObject: err,
      }
    }
  }
}
