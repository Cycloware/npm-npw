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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3Bhd25lci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9ucG0vc3Bhd25lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLG9DQUFvQztBQUVwQyx1Q0FBd0M7QUFDeEMsK0JBQWdDO0FBQ2hDLDJCQUE0QjtBQUM1QiwyQkFBNEI7QUFFNUIseUNBQWtDO0FBRWxDLGdEQUFvSTtBQUVwSTs7Ozs7R0FLRztBQUNILHNCQUE2QixRQUFnQixFQUFFLE9BQWdCO0lBQzdELE9BQU8sR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDO0lBQ3BCLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQztRQUNsQixLQUFLLEVBQUUsUUFBUTtLQUNoQixDQUFDLENBQUM7SUFFSCxpQkFBaUI7SUFDakIsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBRWQsTUFBTSxhQUFhLEdBQUcsNENBQThCLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDL0QsRUFBRSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1FBQ25CLE1BQU0sb0JBQW9CLEdBQUcsR0FBRyxtQkFBbUIsQ0FBQyxHQUFHLEtBQUssYUFBYSxjQUFjLDRCQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3hILE9BQU8sQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUNwQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFFRCxNQUFNLGNBQWMsR0FBRyxDQUFDLGNBQWMsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO0lBRTdELE1BQU0sYUFBYSxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7SUFFcEYsT0FBTyxD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