#!/usr/bin/env node
'use strict';

const executor = require('../executor-multi-npm');

const ret1 = executor('npw-reinstall-global', [], undefined, ['uninstall', '--global']);
if (typeof ret1 === 'object') {
  if (ret1.constructor) {
    if (ret1.constructor.name === 'Promise') {
      ret1.then(() =>
        executor('npw-reinstall-global', [], undefined, ['install', '--global'])
      );
    }
  }

}
