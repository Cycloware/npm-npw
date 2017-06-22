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
