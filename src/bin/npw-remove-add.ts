#!/usr/bin/env node
'use strict';

import { executor } from '../executor';

executor({ commandText: 'npw-remove-add', argsIn: ['--remove-add', '--sym'] });

