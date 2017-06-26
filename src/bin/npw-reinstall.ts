#!/usr/bin/env node
'use strict';

import { executor } from '../executor';

executor({ commandText: 'npw-reinstall', argsIn: ['--blast', 'install', '--sym'] });

