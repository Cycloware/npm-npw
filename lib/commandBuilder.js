"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("colors");
const pushArray_1 = require("./pushArray");
class CommandBuilder {
    constructor() {
        this.commandObjects = [];
        this.actionArrayMap = [];
        this.lookupActionMap = {};
        this.defaultCommandOptions = { nArgs: 0, justPeek: false };
    }
    static Start() {
        return new CommandBuilder();
    }
    command(switches, action, options) {
        let { nArgs, justPeek } = options || this.defaultCommandOptions;
        if (!nArgs || nArgs < 0) {
            nArgs = this.defaultCommandOptions.nArgs;
        }
        if (justPeek === undefined) {
            justPeek = this.defaultCommandOptions.justPeek;
        }
        const switchMap = {};
        const commandObject = {
            switches,
            switchMap,
            action,
            nArgs,
            justPeek
        };
        this.commandObjects.push(commandObject);
        const commandSwitches = switches.map(p => {
            return {
                key: p.toLowerCase(),
                keyActual: p,
                nArgs,
                justPeek,
                action,
                commandObject,
            };
        });
        pushArray_1.pushArray(this.actionArrayMap, commandSwitches);
        for (const actionItem of commandSwitches) {
            const actionKey = actionItem.key;
            this.lookupActionMap[actionKey] = actionItem;
            switchMap[actionKey] = actionItem;
        }
        return this;
    }
    processCommands(argsIn) {
        const { nullActionItem } = CommandBuilder;
        const argsToPassLead = [];
        const argsToPass = [];
        const argsToPassAdditional = [];
        const actionsMatched = {};
        for (let dex = 0; dex < argsIn.length; dex++) {
            const val = argsIn[dex];
            const valLower = val.toLowerCase();
            const actionObject = this.lookupActionMap[valLower];
            const { action, nArgs, justPeek } = actionObject || nullActionItem;
            let takeAt = dex + 1;
            const argsTaken = argsIn.slice(takeAt, takeAt + nArgs);
            dex += nArgs;
            if (action) {
                action(argsTaken, argsToPassLead, argsToPassAdditional);
                actionsMatched[val] = Object.assign({ matchDex: dex }, actionObject);
            }
            if (justPeek) {
                argsToPass.push(val);
                if (nArgs > 0) {
                    pushArray_1.pushArray(argsToPass, argsTaken);
                }
            }
        }
        return {
            actionsMatched,
            args: {
                in: argsIn,
                toPassLead: argsToPassLead,
                toPass: argsToPass,
                toPassAdditional: argsToPassAdditional,
            },
        };
    }
}
CommandBuilder.nullActionItem = { nArgs: 0, justPeek: true, action: undefined };
exports.CommandBuilder = CommandBuilder;
