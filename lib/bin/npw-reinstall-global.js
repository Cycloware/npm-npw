#!/usr/bin/env node
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const executor_multi_npm_1 = require("../executor-multi-npm");
executor_multi_npm_1.executor({ commandText: 'npw-reinstall-global', argsAsIs: ['uninstall', '--global'] }).then(() => executor_multi_npm_1.executor({ commandText: 'npw-reinstall-global', argsAsIs: ['install', '--global'] }));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnB3LXJlaW5zdGFsbC1nbG9iYWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvYmluL25wdy1yZWluc3RhbGwtZ2xvYmFsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFDQSxZQUFZLENBQUM7O0FBRWIsOERBQWlEO0FBRWpELDZCQUFRLENBQUMsRUFBRSxXQUFXLEVBQUUsc0JBQXNCLEVBQUUsUUFBUSxFQUFFLENBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFDMUYsNkJBQVEsQ0FBQyxFQUFFLFdBQVcsRUFBRSxzQkFBc0IsRUFBRSxRQUFRLEVBQUUsQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUNyRixDQUFBIn0=