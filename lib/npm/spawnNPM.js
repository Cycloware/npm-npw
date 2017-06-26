"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3Bhd25OUE0uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbnBtL3NwYXduTlBNLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsaURBQXVDO0FBRXZDOzs7OztHQUtHO0FBQ0gsa0JBQWlDLElBQWMsRUFBRSxPQUFnQjtJQUMvRCxJQUFJLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO0lBQ3ZDLGlCQUFpQjtJQUNqQiwyQkFBMkI7SUFDM0IsSUFBSTtJQUNKLFNBQVM7SUFDVCwwQkFBMEI7SUFDMUIsSUFBSTtJQUVKLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNO1FBQ2pDLHNEQUFzRDtRQUN0RCxNQUFNLFVBQVUsR0FBRyxxQkFBSyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUU7WUFDcEMsS0FBSyxFQUFFLElBQUk7WUFDWCxLQUFLLEVBQUUsU0FBUztTQUNqQixDQUFDLENBQUM7UUFDSCxpQkFBaUI7UUFDakIscUNBQXFDO1FBQ3JDLHFDQUFxQztRQUNyQyxJQUFJO1FBQ0osVUFBVSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRztZQUN4QixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDZCxDQUFDLENBQUMsQ0FBQztRQUNILFVBQVUsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFO1lBQ3JCLE9BQU8sRUFBRSxDQUFDO1FBQ1osQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUExQkQsMkJBMEJDO0FBQUEsQ0FBQyJ9