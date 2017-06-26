#!/usr/bin/env node
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const executor_multi_npm_1 = require("../executor-multi-npm");
executor_multi_npm_1.executor({ commandText: 'npw-reinstall-global', argsAsIs: ['uninstall', '--global'] }).then(() => executor_multi_npm_1.executor({ commandText: 'npw-reinstall-global', argsAsIs: ['install', '--global'] }));
