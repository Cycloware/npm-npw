#!/usr/bin/env node
'use strict';

const executor = require('../executor');

executor('npw-install', ['install', '--save-dev']);