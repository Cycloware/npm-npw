#!/usr/bin/env node
'use strict';
import { executor } from '../executor-multi-npm';

executor({ commandText: 'npw-add-remove-global', argsAsIs: ['add', '--global'] }).then(() =>
  executor({ commandText: 'npw-add-remove-global', argsAsIs: ['remove', '--global'] })
)
