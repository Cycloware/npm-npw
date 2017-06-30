import 'colors';
import 'chalk';

import * as yargs from 'yargs';

import { EGlobalParams, TGlobalOptions } from './entry-options';

import { package_add } from './commands/package-add';
import { package_remove } from './commands/package-remove';

async function plep2(val: any) {
  console.log(`in plep2: ${val}`);
}

async function plep1(val: any) {
  console.log(`in plep1: ${val}`);
  await plep2(val);
  console.log(`out plep1: ${val}`);
}

const promises = [];
console.log(`a`)
promises.push(plep1(2));
console.log(`b`)
promises.push(plep1(3));
console.log(`c`)

// await Promise.all(promises);
const argvApp = yargs
  .options({
    [EGlobalParams.cd]: {
      description: 'directory to change to for this command',
      string: true,
      normalize: true,
      global: true,
    }
  })
  .command(package_add)
  .command(package_remove)
  .demandCommand(1, 1, 'Please specify a command to run.', 'Only one command may be ran at a time.')
  .help()
  .wrap(72)
  .argv


console.log(`App running...`);
console.log(`Dumping argvApp: ${JSON.stringify(argvApp, null, 1)}`);
console.log(`After dump...`);

