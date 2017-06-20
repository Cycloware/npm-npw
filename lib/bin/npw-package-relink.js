#!/usr/bin/env node
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const executor_1 = require("../executor");
executor_1.executor({ commandText: 'npw-package-relink', argsIn: ['--package-relink'] }).then(() => executor_1.executor({ commandText: 'npw-package-relink', argsIn: ['link'] }));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnB3LXBhY2thZ2UtcmVsaW5rLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2Jpbi9ucHctcGFja2FnZS1yZWxpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUNBLFlBQVksQ0FBQzs7QUFFYiwwQ0FBdUM7QUFFdkMsbUJBQVEsQ0FBQyxFQUFFLFdBQVcsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFDakYsbUJBQVEsQ0FBQyxFQUFFLFdBQVcsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQ2xFLENBQUMifQ==