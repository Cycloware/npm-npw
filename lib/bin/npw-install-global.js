#!/usr/bin/env node
'use strict';

const executor = require('../executor-multi-npm');

executor('npw-install-global', [], undefined, ['install', '--global']);
