import * as yargs from 'yargs';

interface IYargsEx extends yargs.Argv {

}

const { command: actualCommandImpl, ...yargsNoCommand } = yargs;

type IYargsNoCommand = typeof yargsNoCommand;

const yargsNew = { ...yargs, command: ((x) => true) as ((opts: string) => boolean), };

// yargsNew.command()

export type TOptionType<T> = { propType: T }
export function buildCommandOptions<TOptions extends { [key: string]: (yargs.Options & TOptionType<any>) }>(options: TOptions) {
  const keyMap = {} as {[KOptions in keyof TOptions]: string};
  for (const prop in options) {
    keyMap[prop] = prop;
  }
  const ret = {
    options,
    keyMap,
    type: null as {[KOptions in keyof TOptions]: TOptions[KOptions]['propType']},
  }
  return ret;
}
