#!/usr/bin/env node
'use strict';

import { executor } from '../executor';

executor({ commandText: 'npw-uninstall-install', argsIn: ['--uninstall-install'] });

