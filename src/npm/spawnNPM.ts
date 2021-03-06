import { spawn } from  'child_process';

/**
 * Spawn the NPM command.
 * @param  {String[]} args    Command arguments.
 * @param  {Boolean}  verbose Display more information.
 * @return {Promise}          Promise of spawn.
 */
export default function spawnNPM(args: string[], verbose: boolean) {
  args = Array.isArray(args) ? args : [];
  // if (verbose) {
  // 	args.push('--verbose');
  // }
  // else {
  // 	args.push('--silent');
  // }

  return new Promise((resolve, reject) => {
    // console.log(`npm curdir '${process.cwd().yellow}'`)
    const processNpm = spawn('npm', args, {
      shell: true,
      stdio: verbose ? 'inherit' : undefined,
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
};
