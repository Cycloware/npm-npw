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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2VyLW1lc3NhZ2VzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2xvZ2dlci1tZXNzYWdlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLE1BQU0sdUJBQXVCLEdBQUc7SUFDOUIsS0FBSyxDQUFDLEdBQVc7UUFDZixPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3BCLENBQUM7SUFDRCxJQUFJLENBQUMsR0FBVztRQUNkLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDcEIsQ0FBQztJQUNELElBQUksQ0FBQyxHQUFXO1FBQ2QsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNwQixDQUFDO0lBQ0QsS0FBSyxDQUFDLEdBQVc7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3JCLENBQUM7Q0FDRixDQUFDO0FBRUYsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLENBQUM7QUFFMUIscUJBQTRCLE1BQWlCO0lBQzNDLE1BQU0sR0FBRyxxQkFBUSx1QkFBdUIsQ0FBRSxDQUFDO0lBQzNDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDdkIsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFlLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hDLEdBQUcsQ0FBQyxJQUFlLENBQUMsR0FBRyxPQUFPLENBQUM7UUFDakMsQ0FBQztJQUNILENBQUM7SUFDRCxNQUFNLENBQUMsR0FBRyxDQUFDO0FBQ2IsQ0FBQztBQVJELGtDQVFDO0FBb0JEO0lBQ0UsTUFBTSxDQUFDO1FBQ0wsUUFBUSxFQUFFLGlCQUFpQixFQUFFO0tBQzlCLENBQUE7QUFDSCxDQUFDO0FBSkQsc0NBSUM7QUFDRDtJQUNFLE1BQU0sQ0FBQztRQUNMLEtBQUssRUFBRSxFQUFFO1FBRVQsS0FBSyxDQUFDLEdBQVc7WUFDZixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUMxQyxDQUFDO1FBQ0QsSUFBSSxDQUFDLEdBQVc7WUFDZCxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUN6QyxDQUFDO1FBQ0QsSUFBSSxDQUFDLEdBQVc7WUFDZCxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQTtRQUN4QyxDQUFDO1FBQ0QsS0FBSyxDQUFDLEdBQVc7WUFDZixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQTtRQUN6QyxDQUFDO0tBQ0YsQ0FBQztBQUNKLENBQUM7QUFqQkQsOENBaUJDIn0=