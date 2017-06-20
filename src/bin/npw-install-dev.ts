#!/usr/bin/env node
'use strict';

import { executor } from '../executor';

executor({ commandText: 'npw-install-dev', argsIn: ['install', '--save-dev'] });
