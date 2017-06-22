"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Promise = require("bluebird");
const child_process_1 = require("child_process");
/**
 * Spawn the NPM command.
 * @param  {String[]} args    Command arguments.
 * @param  {Boolean}  verbose Display more information.
 * @return {Promise}          Promise of spawn.
 */
function spawnNPM(args, verbose) {
    args = Array.isArray(args) ? args : [];
    // if (verbose) {
    // 	args.push('--verbose');
    // }
    // else {
    // 	args.push('--silent');
    // }
    return new Promise((resolve, reject) => {
        // console.log(`npm curdir '${process.cwd().yellow}'`)
        const processNpm = child_process_1.spawn('npm', args, {
            shell: true,
            stdio: 'inherit'
        });
        // if (verbose) {
        //   npm.stdout.pipe(process.stdout);
        //   npm.stderr.pipe(process.stderr);
        // }
        processNpm.on('error', err => {
            reject(err);
        });
        processNpm.on('close', () => {
            resolve();
        });
    });
}
exports.default = spawnNPM;
;
