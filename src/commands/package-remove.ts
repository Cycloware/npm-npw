import 'colors';
import chalk = require('chalk');
import ora = require('ora');
import * as yargs from 'yargs';

import { DBlastMode, spawnerNpm, spawnerLines, spawnerBlast } from '../npm/spawner';

import fs = require('fs-extra-promise');
import path = require('path');
import del = require('del');

import { unquote } from '../unquote';

import { notifier } from '../notifier';

import { CommandBuilder } from '../commandBuilder';
import { ChangeDirectory } from '../changeDirectory';

import { getChangeDirectoryToWithThrow } from '../getChangeDirectoryToWithThrow';
import { getStatInfo } from '../getStatInfo';

import { GlobalLogger as _log } from '../logger';

import { moduleLinker } from '../executor-sym-installer';

const enum params {
  packages = 'packages',
}

export const package_remove: yargs.CommandModule = {
  command: `remove [${params.packages}..]`,
  aliases: ['+'],
  desc: 'Set a config variable',
  builder: (yargs) => yargs
    .options({
      [params.packages]: {
        description: 'Name of package(s) to remove.',
        array: true,
        string: true,
        required: true,
        coerce: (val: any) => {
          // if(Array.isArray(val))
          // {
          //   return val.map(p=> p !== )
          // }
          // console.log(`coerce pkg: ${val}`)
          return val;
        }
      },
      'global': {
        alias: 'g',
        boolean: true,
        array: false,
        default: false,
        description: 'Remove global package.'
      }
    }),
  handler: (argvIn) => {
    console.log(`Dumping argv: ${JSON.stringify(argvIn, null, 1).white}`.gray)
  },
}
