'use strict';

const arrvl = require('arrvl');

const { spawn } = require('child_process');

/**
 * Spawn the NPM command.
 * @param  {String[]} args    Command arguments.
 * @param  {Boolean}  verbose Display more information.
 * @return {Promise}          Promise of spawn.
 */
module.exports = function spawnNPM(args, verbose) {
  args = arrvl(args, []);
  // if (verbose) {
  // 	args.push('--verbose');
  // }
  // else {
  // 	args.push('--silent');
  // }

  return new Promise((resolve, reject) => {
    // console.log(`npm curdir '${process.cwd().yellow}'`)
    let npm = spawn('npm', args, {
      shell: true,
      stdio: 'inherit'
    });
    // if (verbose) {
    //   npm.stdout.pipe(process.stdout);
    //   npm.stderr.pipe(process.stderr);
    // }
    npm.on('error', err => {
      reject(err);
    });
    npm.on('close', () => {
      resolve();
    });
  });
};
