"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Promise = require("bluebird");
const fs = require("fs-extra-promise");
const chalk = require("chalk");
const del = require("del");
const ora = require("ora");
const spawnNPM_1 = require("./spawnNPM");
const lineEncoder_1 = require("../lineEncoder");
/**
 * Spawn blast (remove) command.
 * @param  {String}  [lineMode=all] Blast mode ('crlf', 'lf', 'cr')
 * @param  {Boolean} [verbose=false] Display more information.
 * @return {Promise}                 Promise of spawnBlast.
 */
function spawnerLines(lineMode, verbose) {
    verbose = !!verbose;
    const spinner = ora({
        color: 'yellow'
    });
    // starting enter
    console.log();
    const upperLineMode = lineEncoder_1.coearceLineModeFromInputString(lineMode);
    if (!upperLineMode) {
        const invalidOptionMessage = `${'Invalid line mode'.red}: ${upperLineMode}; Must be: ${lineEncoder_1.validLineModes.join(', ').gray}`;
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
            const result = lineEncoder_1.setLineEnding(data.toString(), upperLineMode);
            const retGood = Object.assign({ fileName, errorObject: undefined }, result);
            if (result.changed) {
                return fs.writeFileAsync(fileName, result.output).then(() => {
                    return Object.assign({ error: 'none' }, retGood);
                }).catch(err => {
                    return Object.assign({ error: 'writeError', errorObject: err }, retGood);
                });
            }
            else {
                return Object.assign({ error: 'none' }, retGood);
            }
        }).catch(err => {
            return {
                error: (err.code === 'ENOENT') ? 'notFound' : 'otherError',
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
            successString += `${chalk.yellow(`Changed to ${upperLineMode}`)}: ${changedItemsString}; `;
        }
        if (notChangedItemsString) {
            successString += `${chalk.white.bgGreen(`Already ${upperLineMode}`)}: ${notChangedItemsString}; `;
        }
        if (notFoundString) {
            successString += `${chalk.magenta('Not Found')}: ${notFoundString}; `;
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
`;
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
exports.spawnerLines = spawnerLines;
/**
 * Spawn blast (remove) command.
 * @param  {String}  [blastMode=all] Blast mode (all|node|lock)
 * @param  {Boolean} [verbose=false] Display more information.
 * @return {Promise}                 Promise of spawnBlast.
 */
function spawnerBlast(blastMode, verbose) {
    verbose = !!verbose;
    const spinner = ora({
        color: 'yellow'
    });
    console.log();
    const blastItems = [];
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
        .then(() => {
        spinner.succeed(`${chalk.green('Blasted (removed)')} ${blastItemsAsString}`);
        return Promise.resolve();
    })
        .catch(err => {
        process.stderr.write(err.toString());
        return err;
    });
}
exports.spawnerBlast = spawnerBlast;
/**
 * Spawn NPM.
 * @param  {String[]} npmArgs         args to pass to npm.
 * @param  {Boolean}  [verbose=false] Display more information.
 * @return {Promise}                  Promise of spawn.
 */
function spawnerNpm(npmArgs, verbose) {
    verbose = !!verbose;
    let spinner = ora({
        color: 'yellow'
    });
    let argsAsString = chalk.cyan.bold(npmArgs.join(' '));
    const startMessage = `${chalk.yellow('Running')} ${chalk.cyan('npm')} ${argsAsString} ...`;
    ;
    if (verbose) {
        console.log(`
${chalk.yellow('-')} ${startMessage}
`);
    }
    else {
        spinner.text = startMessage;
        spinner.start();
    }
    return spawnNPM_1.default(npmArgs, verbose)
        .then(() => {
        const finishMessage = `${chalk.green('Finished')} ${chalk.cyan('npm')} ${argsAsString}`;
        if (verbose) {
            console.log(`
${chalk.green('√')} ${finishMessage}`);
        }
        else {
            spinner.succeed(finishMessage);
        }
        return Promise.resolve();
    })
        .catch(err => {
        process.stderr.write(err.toString());
        return err;
    });
}
exports.spawnerNpm = spawnerNpm;
