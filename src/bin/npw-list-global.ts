#!/usr/bin/env node
'use strict';

import { executor } from '../executor';

executor({ commandText: 'npw-list-global', argsIn: ['--list-global'] });
