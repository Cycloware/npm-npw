#!/usr/bin/env node
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const executor_multi_npm_1 = require("../executor-multi-npm");
executor_multi_npm_1.executor({ commandText: 'npw-add-remove-global', argsAsIs: ['add', '--global'] }).then(() => executor_multi_npm_1.executor({ commandText: 'npw-add-remove-global', argsAsIs: ['remove', '--global'] }));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnB3LXJlbW92ZS1hZGQtZ2xvYmFsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2Jpbi9ucHctcmVtb3ZlLWFkZC1nbG9iYWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUNBLFlBQVksQ0FBQzs7QUFDYiw4REFBaUQ7QUFFakQsNkJBQVEsQ0FBQyxFQUFFLFdBQVcsRUFBRSx1QkFBdUIsRUFBRSxRQUFRLEVBQUUsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUNyRiw2QkFBUSxDQUFDLEVBQUUsV0FBVyxFQUFFLHVCQUF1QixFQUFFLFFBQVEsRUFBRSxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDLENBQ3JGLENBQUEifQ==