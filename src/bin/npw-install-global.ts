#!/usr/bin/env node
'use strict';

import { executor } from '../executor-multi-npm';

executor({ commandText: 'npw-install-global', argsAsIs: ['install', '--global'] });

