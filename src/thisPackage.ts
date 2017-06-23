
const _info = require('../package.json');

export const AllPackageInfo = _info;

export const ThisPackage = {
  name: _info.name as string,
  version: _info.version as string,
}
