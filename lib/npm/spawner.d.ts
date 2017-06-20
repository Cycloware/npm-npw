/// <reference types="bluebird" />
import * as Promise from 'bluebird';
/**
 * Spawn blast (remove) command.
 * @param  {String}  [lineMode=all] Blast mode ('crlf', 'lf', 'cr')
 * @param  {Boolean} [verbose=false] Display more information.
 * @return {Promise}                 Promise of spawnBlast.
 */
export declare function spawnerLines(lineMode: string, verbose: boolean): Promise<any>;
export declare type DBlastMode = 'all' | 'node' | 'lock';
/**
 * Spawn blast (remove) command.
 * @param  {String}  [blastMode=all] Blast mode (all|node|lock)
 * @param  {Boolean} [verbose=false] Display more information.
 * @return {Promise}                 Promise of spawnBlast.
 */
export declare function spawnerBlast(blastMode: DBlastMode, verbose: boolean): Promise<any>;
/**
 * Spawn NPM.
 * @param  {String[]} npmArgs         args to pass to npm.
 * @param  {Boolean}  [verbose=false] Display more information.
 * @return {Promise}                  Promise of spawn.
 */
export declare function spawnerNpm(npmArgs: string[], verbose: boolean): Promise<any>;
