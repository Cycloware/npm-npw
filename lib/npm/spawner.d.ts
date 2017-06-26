/**
 * Spawn blast (remove) command.
 * @param  {String}  [lineMode=all] Blast mode ('crlf', 'lf', 'cr')
 * @param  {Boolean} [verbose=false] Display more information.
 * @return {Promise}                 Promise of spawnBlast.
 */
export declare function spawnerLines(lineMode: string, verbose: boolean): Promise<({
    noEncoding: boolean;
    changed: boolean;
    input: string;
    inputEncoding: "CR" | "LF" | "CRLF" | "NA";
    output: string;
    outputEncoding: "CR" | "LF" | "CRLF" | "NA";
    fileName: string;
    errorObject: any;
    error: string;
} | {
    error: "notFound" | "otherError";
    errorObject: any;
    fileName: string;
    changed: boolean;
})[]>;
export declare type DBlastMode = 'all' | 'node' | 'lock';
/**
 * Spawn blast (remove) command.
 * @param  {String}  [blastMode=all] Blast mode (all|node|lock)
 * @param  {Boolean} [verbose=false] Display more information.
 * @return {Promise}                 Promise of spawnBlast.
 */
export declare function spawnerBlast(blastMode: DBlastMode, verbose: boolean): Promise<void>;
/**
 * Spawn NPM.
 * @param  {String[]} npmArgs         args to pass to npm.
 * @param  {Boolean}  [verbose=false] Display more information.
 * @return {Promise}                  Promise of spawn.
 */
export declare function spawnerNpm(npmArgs: string[], verbose: boolean): Promise<void>;
