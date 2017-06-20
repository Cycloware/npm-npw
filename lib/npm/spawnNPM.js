"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Promise = require("bluebird");
const child_process_1 = require("child_process");
/**
 * Spawn the NPM command.
 * @param  {String[]} args    Command arguments.
 * @param  {Boolean}  verbose Display more information.
 * @return {Promise}          Promise of spawn.
 */
function spawnNPM(args, verbose) {
    args = Array.isArray(args) ? args : [];
    // if (verbose) {
    // 	args.push('--verbose');
    // }
    // else {
    // 	args.push('--silent');
    // }
    return new Promise((resolve, reject) => {
        // console.log(`npm curdir '${process.cwd().yellow}'`)
        const processNpm = child_process_1.spawn('npm', args, {
            shell: true,
            stdio: 'inherit'
        });
        // if (verbose) {
        //   npm.stdout.pipe(process.stdout);
        //   npm.stderr.pipe(process.stderr);
        // }
        processNpm.on('error', err => {
            reject(err);
        });
        processNpm.on('close', () => {
            resolve();
        });
    });
}
exports.default = spawnNPM;
;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3Bhd25OUE0uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbnBtL3NwYXduTlBNLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsb0NBQW9DO0FBRXBDLGlEQUF1QztBQUV2Qzs7Ozs7R0FLRztBQUNILGtCQUFpQyxJQUFjLEVBQUUsT0FBZ0I7SUFDL0QsSUFBSSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztJQUN2QyxpQkFBaUI7SUFDakIsMkJBQTJCO0lBQzNCLElBQUk7SUFDSixTQUFTO0lBQ1QsMEJBQTBCO0lBQzFCLElBQUk7SUFFSixNQUFNLENBQUMsSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTTtRQUNqQyxzREFBc0Q7UUFDdEQsTUFBTSxVQUFVLEdBQUcscUJBQUssQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFO1lBQ3BDLEtBQUssRUFBRSxJQUFJO1lBQ1gsS0FBSyxFQUFFLFNBQVM7U0FDakIsQ0FBQyxDQUFDO1FBQ0gsaUJBQWlCO1FBQ2pCLHFDQUFxQztRQUNyQyxxQ0FBcUM7UUFDckMsSUFBSTtRQUNKLFVBQVUsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUc7WUFDeEIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2QsQ0FBQyxDQUFDLENBQUM7UUFDSCxVQUFVLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRTtZQUNyQixPQUFPLEVBQUUsQ0FBQztRQUNaLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBMUJELDJCQTBCQztBQUFBLENBQUMifQ==