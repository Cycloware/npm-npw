"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _consoleLoggerAllLevels = {
    trace(msg) {
        console.info(msg);
    },
    info(msg) {
        console.info(msg);
    },
    warn(msg) {
        console.warn(msg);
    },
    error(msg) {
        console.error(msg);
    }
};
const _nullOp = () => { };
function buildLogger(levels) {
    const ret = Object.assign({}, _consoleLoggerAllLevels);
    for (const prop in ret) {
        if (levels.indexOf(prop) < 0) {
            ret[prop] = _nullOp;
        }
    }
    return ret;
}
exports.buildLogger = buildLogger;
function buildMessages() {
    return {
        messages: buildMessagesCore(),
    };
}
exports.buildMessages = buildMessages;
function buildMessagesCore() {
    return {
        items: [],
        trace(msg) {
            this.items.push({ type: 'trace', msg });
        },
        info(msg) {
            this.items.push({ type: 'info', msg });
        },
        warn(msg) {
            this.items.push({ type: 'warn', msg });
        },
        error(msg) {
            this.items.push({ type: 'error', msg });
        },
    };
}
exports.buildMessagesCore = buildMessagesCore;
