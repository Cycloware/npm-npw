"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra-promise");
const chalk = require("chalk");
const del = require("del");
const ora = require("ora");
const spawnNPM_1 = require("./spawnNPM");
const lineEncoder_1 = require("../lineEncoder");
const logger_1 = require("../logger");
/**
 * Spawn blast (remove) command.
 * @param  {String}  [lineMode=all] Blast mode ('crlf', 'lf', 'cr')
 * @param  {Boolean} [verbose=false] Display more information.
 * @return {Promise}                 Promise of spawnBlast.
 */
async function spawnerLines(lineMode, verbose) {
    verbose = !!verbose;
    const spinner = ora({
        color: 'yellow'
    });
    // starting enter
    logger_1.GlobalLogger.info('');
    const upperLineMode = lineEncoder_1.coearceLineModeFromInputString(lineMode);
    if (!upperLineMode) {
        const invalidOptionMessage = `${'Invalid line mode'.red}: ${upperLineMode}; Must be: ${lineEncoder_1.validLineModes.join(', ').gray}`;
        logger_1.GlobalLogger.error(invalidOptionMessage);
        throw new Error(invalidOptionMessage.strip);
    }
    const normalizeItems = ['package.json', 'package-lock.json'];
    const itemsAsString = normalizeItems.map(p => `'${p.bgBlack.gray.bold}'`).join(' ');
    spinner.text = `${'Normalizing lines'.yellow} ${itemsAsString}...`;
    spinner.start();
    const normalizePromises = normalizeItems.map(async (fileName) => {
        try {
            const data = await fs.readFileAsync(fileName, { throws: false });
            const result = lineEncoder_1.setLineEnding(data.toString(), upperLineMode);
            const retGood = Object.assign({ fileName, errorObject: undefined }, result);
            if (result.changed) {
                try {
                    await fs.writeFileAsync(fileName, result.output);
                    return Object.assign({ error: 'none' }, retGood);
                }
                catch (err) {
                    return Object.assign({ error: 'writeError', errorObject: err }, retGood);
                }
            }
            else {
                return Object.assign({ error: 'none' }, retGood);
            }
        }
        catch (err) {
            return {
                error: (err.code === 'ENOENT') ? 'notFound' : 'otherError',
                errorObject: err,
                fileName: fileName,
                changed: false,
            };
        }
    });
    try {
        const results = await Promise.all(normalizePromises);
        const notFound = results.filter(p => p.error === 'notFound');
        const otherError = results.filter(p => (p.error !== 'none') && (p.error !== 'notFound'));
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
        return results;
    }
    catch (err) {
        const msg = `${'Normalize lines FAILED'.red}: ${itemsAsString}; Err: ${chalk.gray(err)}`;
        throw new Error(msg);
    }
}
exports.spawnerLines = spawnerLines;
/**
 * Spawn blast (remove) command.
 * @param  {String}  [blastMode=all] Blast mode (all|node|lock)
 * @param  {Boolean} [verbose=false] Display more information.
 * @return {Promise}                 Promise of spawnBlast.
 */
async function spawnerBlast(blastMode, verbose) {
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
    try {
        await del(blastItems);
        spinner.succeed(`${chalk.green('Blasted (removed)')} ${blastItemsAsString}`);
    }
    catch (err) {
        spinner.fail(`${chalk.red('Blast (removal) failed')}: ${blastItems}; Err: ${chalk.gray(err)}`);
        process.stderr.write(err.toString());
        throw err;
    }
}
exports.spawnerBlast = spawnerBlast;
/**
 * Spawn NPM.
 * @param  {String[]} npmArgs         args to pass to npm.
 * @param  {Boolean}  [verbose=false] Display more information.
 * @return {Promise}                  Promise of spawn.
 */
async function spawnerNpm(npmArgs, verbose) {
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
    try {
        const ret = await spawnNPM_1.default(npmArgs, verbose);
        const finishMessage = `${chalk.green('Finished')} ${chalk.cyan('npm')} ${argsAsString}`;
        if (verbose) {
            console.log(`
${chalk.green('√')} ${finishMessage}`);
        }
        else {
            spinner.succeed(finishMessage);
        }
    }
    catch (err) {
        process.stderr.write(err.toString());
        throw err;
    }
}
exports.spawnerNpm = spawnerNpm;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3Bhd25lci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9ucG0vc3Bhd25lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHVDQUF3QztBQUN4QywrQkFBZ0M7QUFDaEMsMkJBQTRCO0FBQzVCLDJCQUE0QjtBQUU1Qix5Q0FBa0M7QUFFbEMsZ0RBQW9JO0FBRXBJLHNDQUFpRDtBQUVqRDs7Ozs7R0FLRztBQUNJLEtBQUssdUJBQXVCLFFBQWdCLEVBQUUsT0FBZ0I7SUFDbkUsT0FBTyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUM7SUFDcEIsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDO1FBQ2xCLEtBQUssRUFBRSxRQUFRO0tBQ2hCLENBQUMsQ0FBQztJQUVILGlCQUFpQjtJQUNqQixxQkFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUVkLE1BQU0sYUFBYSxHQUFHLDRDQUE4QixDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQy9ELEVBQUUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztRQUNuQixNQUFNLG9CQUFvQixHQUFHLEdBQUcsbUJBQW1CLENBQUMsR0FBRyxLQUFLLGFBQWEsY0FBYyw0QkFBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUN4SCxxQkFBSSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sSUFBSSxLQUFLLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUVELE1BQU0sY0FBYyxHQUFHLENBQUMsY0FBYyxFQUFFLG1CQUFtQixDQUFDLENBQUM7SUFFN0QsTUFBTSxhQUFhLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMs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