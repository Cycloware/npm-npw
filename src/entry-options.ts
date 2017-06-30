import * as yargs from 'yargs';
import { buildCommandOptions } from './yargs-ex';

export const enum EGlobalParams {
  cd = 'cd'
}
export type TGlobalOptions = {
  [P in EGlobalParams.cd]: string;
}
