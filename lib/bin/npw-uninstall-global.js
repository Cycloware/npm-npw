#!/usr/bin/env node
'use strict';

const executor = require('../executor-multi-npm');

executor('npw-uninstall-global', [], undefined, ['uninstall', '--global']);

