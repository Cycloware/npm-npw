#!/usr/bin/env node
'use strict';

import { executor } from '../executor';

executor({ commandText: 'npw-package-relink', argsIn: ['--package-relink'] }).then(() =>
  executor({ commandText: 'npw-package-relink', argsIn: ['link'] })
);

