#!/usr/bin/env node
'use strict';
import * as Promise from 'bluebird';
import { executor } from '../executor-multi-npm';

executor({ commandText: 'npw-reinstall-global', argsAsIs: ['uninstall', '--global'] }).then(() =>
  executor({ commandText: 'npw-reinstall-global', argsAsIs: ['install', '--global'] })
)
