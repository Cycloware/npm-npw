"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const logger_messages_1 = require("./logger-messages");
tslib_1.__exportStar(require("./logger-messages"), exports);
exports.GlobalLogger = logger_messages_1.buildLogger(['info', 'warn', 'error']);
function changeGlobalLogger(levels) {
    return changeGlobalLoggerTo(logger_messages_1.buildLogger(levels));
}
exports.changeGlobalLogger = changeGlobalLogger;
function changeGlobalLoggerTo(logger) {
    return exports.GlobalLogger = logger;
}
exports.changeGlobalLoggerTo = changeGlobalLoggerTo;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2xvZ2dlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSx1REFBeUU7QUFDekUsNERBQWtDO0FBRXZCLFFBQUEsWUFBWSxHQUFtQiw2QkFBVyxDQUFDLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBRWpGLDRCQUFtQyxNQUFpQjtJQUNsRCxNQUFNLENBQUMsb0JBQW9CLENBQUMsNkJBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBQ25ELENBQUM7QUFGRCxnREFFQztBQUVELDhCQUFxQyxNQUFzQjtJQUN6RCxNQUFNLENBQUMsb0JBQVksR0FBRyxNQUFNLENBQUM7QUFDL0IsQ0FBQztBQUZELG9EQUVDIn0=