#!/usr/bin/env node
'use strict';

import { executor } from '../executor-multi-npm';

executor({ commandText: 'npw-uninstall-global', argsAsIs: ['uninstall', '--global'] });

