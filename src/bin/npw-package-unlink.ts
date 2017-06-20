#!/usr/bin/env node
'use strict';

import { executor } from '../executor';

executor({ commandText: 'npw-package-unlink', argsIn: ['--package-unlink'] });

