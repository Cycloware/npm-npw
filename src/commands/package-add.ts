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

import { TGlobalOptions } from '../entry-options';

import { buildCommandOptions } from '../yargs-ex';

export const commandOptions = buildCommandOptions({
  'packages': {
    description: 'Name of package(s) to add.',
    array: true,
    string: true,
    required: true,
    type: 'string',
    propType: null as string[],
  },
  'global': {
    alias: 'g',
    boolean: true,
    default: false,
    description: 'Install package globally.',
    propType: null as boolean,
  },
  'no-rebuild-symlinks': {
    description: 'Do NOT remove symlinks before package install and then add them back (Only for modules that use symlinks).',
    // alias: 'g',
    boolean: true,
    default: false,
    propType: null as boolean,
  }
});

const { options, keyMap } = commandOptions;

type TArgs = TGlobalOptions & typeof commandOptions.type;

export const package_add: yargs.CommandModule = {
  command: `add [${keyMap['packages']}..]`,
  aliases: ['+'],
  desc: 'Set a config variable',
  builder: (yargs) => yargs
    .options(options)
    .string([keyMap['packages']])
  ,
  handler: (args: TArgs) => {
    const { cd, global, packages, 'no-rebuild-symlinks': noRebuildSymlinks } = args;

    console.log(`In package add: ${JSON.stringify(args, null, 1).white}`.gray)
  },
}
