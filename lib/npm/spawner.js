'use strict';

const chalk = require('chalk');
const del = require('del');
const nvl = require('nvl');
const ora = require('ora');

const MODE = require('../mode');
const spawnNPM = require('./spawnNPM');

/**
 * Spawn blast (remove) command.
 * @param  {String}  [blastMode=all] Blast mode (all|node_modules|lock_file)
 * @param  {Boolean} [verbose=false] Display more information.
 * @return {Promise}                 Promise of spawnBlast.
 */
function spawnerBlast(blastMode, verbose) {
  verbose = nvl(verbose, false);
  let spinner = ora({
    color: 'yellow'
  });

  let blastItems = [];

  if (blastMode === 'all' || blastMode === 'node_modules') {
    blastItems.push('node_modules/');
  }
  if (blastMode === 'all' || blastMode === 'lock_file') {
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
      if (!verbose) {
        spinner.succeed(`${chalk.green('Blasted (removed)')} ${blastItemsAsString}`);
      }
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
