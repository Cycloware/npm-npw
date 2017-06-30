#!/usr/bin/env node
'use strict';

import { executor } from '../executor-multi-npm';

executor({ commandText: 'npw-remove-global', argsAsIs: ['remove', '--global'] });

