"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("colors");
require("chalk");
const yargs = require("yargs");
const package_add_1 = require("./commands/package-add");
const package_remove_1 = require("./commands/package-remove");
async function plep2(val) {
    console.log(`in plep2: ${val}`);
}
async function plep1(val) {
    console.log(`in plep1: ${val}`);
    await plep2(val);
    console.log(`out plep1: ${val}`);
}
const promises = [];
console.log(`a`);
promises.push(plep1(2));
console.log(`b`);
promises.push(plep1(3));
console.log(`c`);
// await Promise.all(promises);
const argvApp = yargs
    .options({
    ["cd" /* cd */]: {
        description: 'directory to change to for this command',
        string: true,
        normalize: true,
        global: true,
    }
})
    .command(package_add_1.package_add)
    .command(package_remove_1.package_remove)
    .demandCommand(1, 1, 'Please specify a command to run.', 'Only one command may be ran at a time.')
    .help()
    .wrap(72)
    .argv;
console.log(`App running...`);
console.log(`Dumping argvApp: ${JSON.stringify(argvApp, null, 1)}`);
console.log(`After dump...`);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50cnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvZW50cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxrQkFBZ0I7QUFDaEIsaUJBQWU7QUFFZiwrQkFBK0I7QUFJL0Isd0RBQXFEO0FBQ3JELDhEQUEyRDtBQUUzRCxLQUFLLGdCQUFnQixHQUFRO0lBQzNCLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0FBQ2xDLENBQUM7QUFFRCxLQUFLLGdCQUFnQixHQUFRO0lBQzNCLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQ2hDLE1BQU0sS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2pCLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0FBQ25DLENBQUM7QUFFRCxNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUM7QUFDcEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtBQUNoQixRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3hCLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7QUFDaEIsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4QixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0FBRWhCLCtCQUErQjtBQUMvQixNQUFNLE9BQU8sR0FBRyxLQUFLO0tBQ2xCLE9BQU8sQ0FBQztJQUNQLGVBQWtCLEVBQUU7UUFDbEIsV0FBVyxFQUFFLHlDQUF5QztRQUN0RCxNQUFNLEVBQUUsSUFBSTtRQUNaLFNBQVMsRUFBRSxJQUFJO1FBQ2YsTUFBTSxFQUFFLElBQUk7S0FDYjtDQUNGLENBQUM7S0FDRCxPQUFPLENBQUMseUJBQVcsQ0FBQztLQUNwQixPQUFPLENBQUMsK0JBQWMsQ0FBQztLQUN2QixhQUFhLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxrQ0FBa0MsRUFBRSx3Q0FBd0MsQ0FBQztLQUNqRyxJQUFJLEVBQUU7S0FDTixJQUFJLENBQUMsRUFBRSxDQUFDO0tBQ1IsSUFBSSxDQUFBO0FBR1AsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQzlCLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDcEUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQyJ9