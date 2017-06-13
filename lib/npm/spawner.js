'use strict';

const Promise = require('bluebird');

const chalk = require('chalk');
const del = require('del');
const nvl = require('nvl');
const ora = require('ora');


const MODE = require('../mode');
const spawnNPM = require('./spawnNPM');

const lineEncoder = require('../lineEncoder');

const validLineModes = ['CRLF', 'LF', 'CR'];
const fs = require('fs-extra-promise');
const ddd = require('fs')

/**
 * Spawn blast (remove) command.
 * @param  {String}  [lineMode=all] Blast mode ('crlf', 'lf', 'cr')
 * @param  {Boolean} [verbose=false] Display more information.
 * @return {Promise}                 Promise of spawnBlast.
 */
function spawnerLines(lineMode, verbose) {
  verbose = nvl(verbose, false);
  let spinner = ora({
    color: 'yellow'
  });

  // starting enter
  console.log();

  const upperLineMode = (typeof lineMode === 'string' ? lineMode : '').toUpperCase();

  if (validLineModes.indexOf(upperLineMode) < 0) {
    const invalidOptionMessage = `${chalk.red('Invalid line mode')}: ${upperLineMode}; Must be: ${chalk.gray(validLineModes.join(', '))}`;
    console.error(invalidOptionMessage);
    return Promise.reject(invalidOptionMessage);
  }

  let normalizeItems = ['package.json', 'package-lock.json'];

  let itemsAsString = normalizeItems.map(p => `'${chalk.bgBlack.gray.bold(p)}'`).join(' ');

  spinner.text = `${chalk.yellow('Normalizing lines')} ${itemsAsString}...`;
  spinner.start();

  const normalizePromises = normalizeItems.map(fileName => {
    return fs.readFileAsync(fileName, { throws: false }).then(data => {
      const result = lineEncoder(data.toString(), upperLineMode);
      const retGood = Object.assign({}, {
        fileName,
      }, result);
      if (result.changed) {
        return fs.writeFileAsync(fileName, result.output).then(() => retGood).catch(err => {
          return {
            error: 'writeError',
            errorObject: err,
            lineResult: retGood,
          }
        })
      } else {
        return retGood;
      }
    }).catch(err => {
      return {
        error: (err.code === 'ENOENT') ? 'notFound' : 'otherError',
        errorObject: err,
        fileName: fileName
      };
    });
  });



  let normalizePromise = Promise.all(normalizePromises).catch(err => {
    spinner.fail(`${chalk.red('Normalize lines FAILED')}: ${blastItems}; Err: ${chalk.gray(err)}`);
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

      const noErrors = results.filter(p => !p.error);

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

/**
 * Spawn blast (remove) command.
 * @param  {String}  [blastMode=all] Blast mode (all|node|lock)
 * @param  {Boolean} [verbose=false] Display more information.
 * @return {Promise}                 Promise of spawnBlast.
 */
function spawnerBlast(blastMode, verbose) {
  verbose = nvl(verbose, false);
  let spinner = ora({
    color: 'yellow'
  });

  console.log();
  
  let blastItems = [];

  if (blastMode === 'all' || blastMode === 'node') {
    blastItems.push('node_modules/');
  }
  if (blastMode === 'all' || blastMode === 'lock') {
    blastItems.push('package-lock.json');

  }

  let blastItemsAsString = blastItems.map(p => `'${chalk.bgBlack.gray.bold(p)}'`).join(' ');

  spinner.text = `${chalk.yellow('Blasting (removing)')} ${blastItemsAsString}...`;
  spinner.start();


  let blastPromise = del(blastItems).catch(err => {
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
function spawner(npmArgs, verbose) {
  verbose = nvl(verbose, false);
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

module.exports = spawner;
module.exports.blast = spawnerBlast;
module.exports.lines = spawnerLines;
