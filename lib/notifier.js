"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const updateNotifier = require("update-notifier");
function notifier() {
    try {
        const pkg = require('../package.json');
        updateNotifier({
            pkg,
            updateCheckInterval: 1000 * 60 * 60 // 1 hour
        }).notify();
    }
    catch (err) {
        console.error(`${'ERROR:'.red}  Failed to setup update notifier. err: ${err}`);
    }
}
exports.notifier = notifier;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvbm90aWZpZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxrREFBa0Q7QUFDbEQ7SUFDRSxJQUFJLENBQUM7UUFDSCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQTJCLENBQUM7UUFFakUsY0FBYyxDQUFDO1lBQ2IsR0FBRztZQUNILG1CQUFtQixFQUFFLElBQUksR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLFNBQVM7U0FDOUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ2QsQ0FBQztJQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDYixPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsUUFBUSxDQUFDLEdBQUcsMkNBQTJDLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDakYsQ0FBQztBQUNILENBQUM7QUFYRCw0QkFXQyJ9