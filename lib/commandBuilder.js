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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZEJ1aWxkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvY29tbWFuZEJ1aWxkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxrQkFBZ0I7QUFPaEIsMkNBQXdDO0FBeUJ4QztJQUVFO1FBU1UsbUJBQWMsR0FBb0MsRUFBRSxDQUFDO1FBQ3JELG1CQUFjLEdBQXdDLEVBQUUsQ0FBQztRQUN6RCxvQkFBZSxHQUE4QixFQUFFLENBQUM7UUFDaEQsMEJBQXFCLEdBQTRCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLENBQUM7SUFWekYsQ0FBQztJQUVNLE1BQU0sQ0FBQyxLQUFLO1FBRWpCLE1BQU0sQ0FBQyxJQUFJLGNBQWMsRUFBRSxDQUFDO0lBQzlCLENBQUM7SUFNRCxPQUFPLENBQUMsUUFBa0IsRUFBRSxNQUFvQyxFQUFFLE9BQTBDO1FBQzFHLElBQUksRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLEdBQUcsT0FBTyxJQUFJLElBQUksQ0FBQyxxQkFBcUIsQ0FBQztRQUNoRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4QixLQUFLLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQztRQUMzQyxDQUFDO1FBQ0QsRUFBRSxDQUFDLENBQUMsUUFBUSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDM0IsUUFBUSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQUM7UUFDakQsQ0FBQztRQUVELE1BQU0sU0FBUyxHQUE4QixFQUFFLENBQUM7UUFDaEQsTUFBTSxhQUFhLEdBQWtDO1lBQ25ELFFBQVE7WUFDUixTQUFTO1lBQ1QsTUFBTTtZQUNOLEtBQUs7WUFDTCxRQUFRO1NBQ1QsQ0FBQztRQUVGLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFD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