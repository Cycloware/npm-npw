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
