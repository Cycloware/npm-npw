const _consoleLoggerAllLevels = {
  trace(msg: string) {
    console.info(msg);
  },
  info(msg: string) {
    console.info(msg);
  },
  warn(msg: string) {
    console.warn(msg);
  },
  error(msg: string) {
    console.error(msg);
  }
};

const _nullOp = () => { };

export function buildLogger(levels: KLogger[]) {
  const ret = { ..._consoleLoggerAllLevels };
  for (const prop in ret) {
    if (levels.indexOf(prop as KLogger) < 0) {
      ret[prop as KLogger] = _nullOp;
    }
  }
  return ret;
}

export type IMessageLogger<KLog extends string = KLogger> = {[P in KLog]: (msg: string) => void};
export type KLogger = 'trace' | 'info' | 'warn' | 'error';

export interface IMessages {
  messages: IMessages.Core;
}
export namespace IMessages {
  export interface Core extends IMessageLogger {
    readonly items: { type: KLogger, msg: string }[];
  }
  export interface WithError extends IMessages {
    errorMessage: string;
  }
  export interface WithPossibleError extends IMessages {
    errorMessage?: string;
  }
}

export function buildMessages(): IMessages {
  return {
    messages: buildMessagesCore(),
  }
}
export function buildMessagesCore(): IMessages.Core {
  return {
    items: [],

    trace(msg: string) {
      this.items.push({ type: 'trace', msg });
    },
    info(msg: string) {
      this.items.push({ type: 'info', msg });
    },
    warn(msg: string) {
      this.items.push({ type: 'warn', msg })
    },
    error(msg: string) {
      this.items.push({ type: 'error', msg })
    },
  };
}
