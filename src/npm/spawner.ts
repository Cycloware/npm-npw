import * as Promise from 'bluebird';

import fs = require('fs-extra-promise');
import chalk = require('chalk');
import del = require('del');
import ora = require('ora');

import spawnNPM from './spawnNPM';

import { getLineEnding, setLineEnding, coearceLineModeFromInputString, validLineModes, TSetLineEndingResult } from '../lineEncoder';

/**
 * Spawn blast (remove) command.
 * @param  {String}  [lineMode=all] Blast mode ('crlf', 'lf', 'cr')
 * @param  {Boolean} [verbose=false] Display more information.
 * @return {Promise}                 Promise of spawnBlast.
 */
export function spawnerLines(lineMode: string, verbose: boolean) {
  verbose = !!verbose;
  const spinner = ora({
    color: 'yellow'
  });

  // starting enter
  console.log();

  const upperLineMode = coearceLineModeFromInputString(lineMode);
  if (!upperLineMode) {
    const invalidOptionMessage = `${'Invalid line mode'.red}: ${upperLineMode}; Must be: ${validLineModes.join(', ').gray}`;
    console.error(invalidOptionMessage);
    return Promise.reject(invalidOptionMessage);
  }

  const normalizeItems = ['package.json', 'package-lock.json'];

  const itemsAsString = normalizeItems.map(p => `'${p.bgBlack.gray.bold}'`).join(' ');

  spinner.text = `${'Normalizing lines'.yellow} ${itemsAsString}...`;
  spinner.start();
  // type TResultAndFilename = Cycle<{ fileName: string } & TSetLineEndingResult>;
  // type TGood = { error: 'none', errorObject: any } & TResultAndFilename;
  // type TWriteError = { error: 'writeError', errorObject: any } & TResultAndFilename;
  // type TExceptionError = { error: 'notFound' | 'otherError', errorObject: any, fileName: string };
  // type TSpawnResult = TGood | TWriteError | TExceptionError;
  const normalizePromises = normalizeItems.map(fileName => {
    return fs.readFileAsync(fileName, { throws: false }).then(data => {
      const result = setLineEnding(data.toString(), upperLineMode);
      const retGood = { fileName, errorObject: undefined as any, ...result };

      if (result.changed) {
        return fs.writeFileAsync(fileName, result.output).then(() => {
          return { error: 'none', ...retGood }
        }).catch(err => {
          return {
            error: 'writeError' as 'writeError',
            errorObject: err,
            ...retGood,
          }
        })
      } else {
        return { error: 'none', ...retGood };
      }
    }).catch(err => {
      return {
        error: (err.code === 'ENOENT') ? 'notFound' : 'otherError' as ('notFound' | 'otherError'),
        errorObject: err,
        fileName: fileName,
        changed: false,
      };
    });
  });



  let normalizePromise = Promise.all(normalizePromises).catch(err => {
    spinner.fail(`${'Normalize lines FAILED'.red}: ${itemsAsString}; Err: ${chalk.gray(err)}`);
    throw err;
  });

  return normalizePromise
    // .then(() => new Promise(function (resolve, reject) {
    //   setTimeout(function () {
    //     resolve();
    //   }, 100)
    // }))
    .then((results) => {

      const notFound = results.filter(p => p.error === 'notFound');
      const otherError = results.filter(p => p.error && (p.error !== 'notFound'));

      const noErrors = results.filter(p => p.error === 'none');

      const changedItems = noErrors.filter(p => p.changed);
      const notChangedItems = noErrors.filter(p => !p.changed);
      // const writeError = results.filter(p => p.error === 'writeError');
      // const otherError = results.filter(p => (p.error !== 'writeError') && (p.error !== 'notFound'));


      let notFoundString = notFound.map(p => `'${chalk.yellow(p.fileName)}'`).join(' ');
      let changedItemsString = changedItems.map(p => `'${chalk.green(p.fileName)}'`).join(' ');
      let notChangedItemsString = notChangedItems.map(p => `'${chalk.green(p.fileName)}'`).join(' ');

      let successString = '';
      if (changedItemsString) {
        successString += `${chalk.yellow(`Changed to ${upperLineMode}`)}: ${changedItemsString}; `
      }
      if (notChangedItemsString) {
        successString += `${chalk.white.bgGreen(`Already ${upperLineMode}`)}: ${notChangedItemsString}; `
      }
      if (notFoundString) {
        successString += `${chalk.magenta('Not Found')}: ${notFoundString}; `
      }

      if (otherError.length > 0) {

        const writeErrorString = otherError.map(p => `${chalk.red(p.error)}: '${chalk.gray(p.fileName)}'; Error: ${chalk.gray(p.errorObject)}`).join(`
 - `);
        let failMessage = `${chalk.red.bold('Normalize Failures')} ${otherError.length} error(s) occured:

 - ${writeErrorString}`;

        if (successString) {
          failMessage += `
          
${chalk.green('Some success here:')}

${successString}
`
        }
        spinner.fail(failMessage);
      }
      else {
        spinner.succeed(`${chalk.green('Normalized')} ${successString}`);
      }
      return Promise.resolve();
    })
    .catch(err => {
      process.stderr.write(err.toString());
      return err;
    });
}


export type DBlastMode = 'all' | 'node' | 'lock';
/**
 * Spawn blast (remove) command.
 * @param  {String}  [blastMode=all] Blast mode (all|node|lock)
 * @param  {Boolean} [verbose=false] Display more information.
 * @return {Promise}                 Promise of spawnBlast.
 */
export function spawnerBlast(blastMode: DBlastMode, verbose: boolean) {
  verbose = !!verbose;
  const spinner = ora({
    color: 'yellow'
  });

  console.log();

  const blastItems: string[] = [];

  if (blastMode === 'all' || blastMode === 'node') {
    blastItems.push('node_modules/');
  }
  if (blastMode === 'all' || blastMode === 'lock') {
    blastItems.push('package-lock.json');

  }

  const blastItemsAsString = blastItems.map(p => `'${chalk.bgBlack.gray.bold(p)}'`).join(' ');

  spinner.text = `${chalk.yellow('Blasting (removing)')} ${blastItemsAsString}...`;
  spinner.start();

  const blastPromise = Promise.resolve(del(blastItems)).catch(err => {
    spinner.fail(`${chalk.red('Blast (removal) failed')}: ${blastItems}; Err: ${chalk.gray(err)}`);
    throw err;
  });

  return blastPromise
    // .then(() => new Promise(function (resolve, reject) {
    //   setTimeout(function () {
    //     resolve();
    //   }, 100)
    // }))
    .then(() => {
      spinner.succeed(`${chalk.green('Blasted (removed)')} ${blastItemsAsString}`);
      return Promise.resolve();
    })
    .catch(err => {
      process.stderr.write(err.toString());
      return err;
    });
}

/**
 * Spawn NPM.
 * @param  {String[]} npmArgs         args to pass to npm.
 * @param  {Boolean}  [verbose=false] Display more information.
 * @return {Promise}                  Promise of spawn.
 */
export function spawnerNpm(npmArgs: string[], verbose: boolean) {
  verbose = !!verbose;
  let spinner = ora({
    color: 'yellow'
  });
  let argsAsString = chalk.cyan.bold(npmArgs.join(' '));

  const startMessage = `${chalk.yellow('Running')} ${chalk.cyan('npm')} ${argsAsString} ...`;;
  if (verbose) {
    console.log(`
${chalk.yellow('-')} ${startMessage}
`)
  } else {
    spinner.text = startMessage;
    spinner.start();
  }

  return spawnNPM(npmArgs, verbose)
    .then(() => {
      const finishMessage = `${chalk.green('Finished')} ${chalk.cyan('npm')} ${argsAsString}`;
      if (verbose) {
        console.log(`
${chalk.green('√')} ${finishMessage}`);
      } else {
        spinner.succeed(finishMessage);
      }
      return Promise.resolve();
    })
    .catch(err => {
      process.stderr.write(err.toString());
      return err;
    });
}
