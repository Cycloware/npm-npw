#!/usr/bin/env node
'use strict';

import { executor } from '../executor';

executor({ commandText: 'npw-blast-lock', argsIn: ['--blast-lock'] });
