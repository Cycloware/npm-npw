interface IPackageInherits {
  name?: string;
  version?: string | { path: string, },
  inherits: {
    "meta-only-packages": {
      [key: string]: { devDependencies?: boolean, dependencies?: boolean }
    },
    "symlinked-modules": {
      [key: string]: { devDependencies?: boolean, dependencies?: boolean }
    }
  },
  "options"?: {
    "no-reformat"?: boolean,
  },
  "devDependencies"?: {
    [key: string]: string | { someStupifField?: boolean, another?: boolean }
  },
  "dependencies"?: {
    [key: string]: string | { someStupifField?: boolean, another?: boolean }
  }
  "npw:symlinkModules"?: {
      [key: string]: string | { someStupifField?: boolean, another?: boolean }
  },
  local?: {
    "devDependencies"?: {
      [key: string]: string | { someStupifField?: boolean, another?: boolean }
    },
    "dependencies"?: {
      [key: string]: string | { someStupifField?: boolean, another?: boolean }
    }
    "npw:symlinkModules"?: {
      [key: string]: string | { someStupifField?: boolean, another?: boolean }
    },
  }
}
