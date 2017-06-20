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
    addCommandOption(switches, action, options) {
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
        return commandObject;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZEJ1aWxkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvY29tbWFuZEJ1aWxkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxrQkFBZ0I7QUFRaEIsMkNBQXdDO0FBeUJ4QztJQUFBO1FBQ0UsbUJBQWMsR0FBb0MsRUFBRSxDQUFDO1FBQ3JELG1CQUFjLEdBQXdDLEVBQUUsQ0FBQztRQUN6RCxvQkFBZSxHQUE4QixFQUFFLENBQUM7UUFDaEQsMEJBQXFCLEdBQTRCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLENBQUM7SUFvRmpGLENBQUM7SUFuRkMsZ0JBQWdCLENBQUMsUUFBa0IsRUFBRSxNQUFvQyxFQUFFLE9BQTBDO1FBQ25ILElBQUksRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLEdBQUcsT0FBTyxJQUFJLElBQUksQ0FBQyxxQkFBcUIsQ0FBQztRQUNoRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4QixLQUFLLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQztRQUMzQyxDQUFDO1FBQ0QsRUFBRSxDQUFDLENBQUMsUUFBUSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDM0IsUUFBUSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQUM7UUFDakQsQ0FBQztRQUVELE1BQU0sU0FBUyxHQUE4QixFQUFFLENBQUM7UUFDaEQsTUFBTSxhQUFhLEdBQWtDO1lBQ25ELFFBQVE7WUFDUixTQUFTO1lBQ1QsTUFBTTtZQUNOLEtBQUs7WUFDTCxRQUFRO1NBQ1QsQ0FBQztRQUVGLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBRXhDLE1BQU0sZUFBZSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNwQyxNQUFNLENBQUM7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