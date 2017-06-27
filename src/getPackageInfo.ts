import 'colors';
import ch = require('chalk');

import fs = require('fs-extra-promise');

// export namespace getPackageInfo {
//   export type TResult = TResultGood | TResultError;
// }

export async function getPackageInfo(packagePath: string): Promise<{ result: 'success', packageInfo: any } | { result: 'not-found' | 'error', err: any, message: string }> {
  try {
    return { result: 'success', packageInfo: await fs.readJSONAsync(packagePath) };
  }
  catch (err) {
    if (err.code === 'ENOENT') {
      return { result: 'not-found', err, message: `The package.json '${packagePath.gray}' was not found` }
    } else {
      return { result: 'error', err, message: `Error loading package.json '${packagePath.gray}'; err: ${ch.gray(err)}` }
    }
  }
}


