import 'colors';

import fs = require('fs-extra-promise');
import path = require('path');

import { unquote } from './unquote';

import { pushArray } from './pushArray';

export namespace CommandBuilder {
  export type IOptions = { nArgs: number, justPeek: boolean }
  export type CommandAction = (args: { taken: string[], toLead: string[], toPass: string[], toEnd: string[] }) => void;

  export type ICommandActionItem = {
    key: string,
    keyActual: string,
    nArgs: number,
    justPeek: boolean,
    action: CommandBuilder.CommandAction,
    commandObject: ICommandObject,
  }

  export type TSwitchMap = { [key: string]: ICommandActionItem }

  export type ICommandObject = {
    switches: string[],
    switchMap: TSwitchMap,
    action: CommandBuilder.CommandAction,
    nArgs: number,
    justPeek: boolean,
  }
}
export class CommandBuilder {

  protected constructor() {

  }

  public static Start() {
    return new CommandBuilder();
  }

  protected commandObjects: CommandBuilder.ICommandObject[] = [];
  protected actionArrayMap: CommandBuilder.ICommandActionItem[] = [];
  protected lookupActionMap: CommandBuilder.TSwitchMap = {};
  protected defaultCommandOptions: CommandBuilder.IOptions = { nArgs: 0, justPeek: false };
  command(switches: string[], action: CommandBuilder.CommandAction, options?: Partial<CommandBuilder.IOptions>) {
    let { nArgs, justPeek } = options || this.defaultCommandOptions;
    if (!nArgs || nArgs < 0) {
      nArgs = this.defaultCommandOptions.nArgs;
    }
    if (justPeek === undefined) {
      justPeek = this.defaultCommandOptions.justPeek;
    }

    const switchMap: CommandBuilder.TSwitchMap = {};
    const commandObject: CommandBuilder.ICommandObject = {
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
      } as CommandBuilder.ICommandActionItem;
    });

    pushArray(this.actionArrayMap, commandSwitches);

    for (const actionItem of commandSwitches) {
      const actionKey = actionItem.key;
      this.lookupActionMap[actionKey] = actionItem;
      switchMap[actionKey] = actionItem;
    }

    return this;
  }

  private static nullActionItem: Partial<CommandBuilder.ICommandActionItem> = { nArgs: 0, justPeek: true, action: undefined };

  processCommands(argsIn: string[]) {
    const { nullActionItem } = CommandBuilder;
    const argsToPassLead: string[] = [];
    const argsToPass: string[] = [];
    const argsToPassAdditional: string[] = [];
    const actionsMatched: { [key: string]: { matchDex: number, } & CommandBuilder.ICommandActionItem } = {};
    for (let dex = 0; dex < argsIn.length; dex++) {
      const val = argsIn[dex];
      const valLower = val.toLowerCase();
      const actionObject = this.lookupActionMap[valLower];
      const { action, nArgs, justPeek } = actionObject || nullActionItem;

      let takeAt = dex + 1;
      const argsTaken = argsIn.slice(takeAt, takeAt + nArgs);
      dex += nArgs;

      if (action) {
        const actionArgs = { taken: argsTaken, toLead: argsToPassLead, toPass: argsToPass, toEnd: argsToPassAdditional };
        action(actionArgs);
        actionsMatched[val] = { matchDex: dex, ...actionObject };
      }

      if (justPeek) {
        argsToPass.push(val);
        if (nArgs > 0) {
          pushArray(argsToPass, argsTaken);
        }
      }
    }
    return {
      actionsMatched,
      args:
      {
        in: argsIn,
        toPassLead: argsToPassLead,
        toPass: argsToPass,
        toPassAdditional: argsToPassAdditional,
      },
    }
  }
}
