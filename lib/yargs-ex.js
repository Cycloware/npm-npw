"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const yargs = require("yargs");
const { command: actualCommandImpl } = yargs, yargsNoCommand = tslib_1.__rest(yargs, ["command"]);
const yargsNew = Object.assign({}, yargs, { command: ((x) => true) });
function buildCommandOptions(options) {
    const keyMap = {};
    for (const prop in options) {
        keyMap[prop] = prop;
    }
    const ret = {
        options,
        keyMap,
        type: null,
    };
    return ret;
}
exports.buildCommandOptions = buildCommandOptions;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieWFyZ3MtZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMveWFyZ3MtZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsK0JBQStCO0FBTS9CLE1BQU0sRUFBRSxPQUFPLEVBQUUsaUJBQWlCLEtBQXdCLEtBQUssRUFBM0IsbURBQTJCLENBQUM7QUFJaEUsTUFBTSxRQUFRLHFCQUFRLEtBQUssSUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQWdDLEdBQUcsQ0FBQztBQUt0Riw2QkFBNEcsT0FBaUI7SUFDM0gsTUFBTSxNQUFNLEdBQUcsRUFBNEMsQ0FBQztJQUM1RCxHQUFHLENBQUMsQ0FBQyxNQUFNLElBQUksSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQzNCLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDdEIsQ0FBQztJQUNELE1BQU0sR0FBRyxHQUFHO1FBQ1YsT0FBTztRQUNQLE1BQU07UUFDTixJQUFJLEVBQUUsSUFBc0U7S0FDN0UsQ0FBQTtJQUNELE1BQU0sQ0FBQyxHQUFHLENBQUM7QUFDYixDQUFDO0FBWEQsa0RBV0MifQ==