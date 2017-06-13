npw
=====

Wraps `npm 5` with extra commands and corrects line-endings in `package*.json` to match .git config.

Usage
-----

Type `npw` and your usual `npm` commands.  Line endings for `package*.json` will match .git config.


``` bat
Usage: npw [options] <npm commands & options> ...

Blast Options:
  --blast  rimrafs node_modules and package-lock.json                  [boolean]

Brief Options:
  --brief  Hide npm command output and instead show a spinner          [boolean]

Line Options:
  --lines                [choices: "crlf", "lf", "cr", "none"] [default: "crlf"]
  --noLines, --noLine                                                  [boolean]

Options:
  --help  Show help                                                    [boolean]

Examples:
  npw                  Wraps 'npm' with extra commands and corrects line-endings
                       in 'package*.json' to match .git config.
  npw --blast install  'rimrafs' node_modules & package-lock.json, then runs npm
                       install

```

Shortcuts
---------

> `npw-blast`, `npw-b`
> - adds `--blast` option
> 

> `npw-blast-node`, `npw-bn`
> - adds `--blast-node` option
> 

> `npw-blast-lock`, `npw-bl`
> - adds `--blast-lock` option
> 

> `npw-install`, `npw-in`, `npw-i`
> - adds `install` npm option
> 

> `npw-uninstall`, `npw-un`, `npw-u`
> - adds `uninstall` npm option
> 

> `npw-reinstall`, `npw-ri`, `npw-r`
> - adds `--blast` option and `install` npm option
> 
