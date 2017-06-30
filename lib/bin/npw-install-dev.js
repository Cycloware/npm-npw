#!/usr/bin/env node
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const executor_1 = require("../executor");
executor_1.executor({ commandText: 'npw-install-dev', argsIn: ['install', '--save-dev'] });
