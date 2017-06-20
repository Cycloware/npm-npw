import * as updateNotifier from 'update-notifier';
export function notifier() {
  try {
    const pkg = require('../package.json') as updateNotifier.Package;

    updateNotifier({
      pkg,
      updateCheckInterval: 1000 * 60 * 60 // 1 hour
    }).notify();
  } catch (err) {
    console.error(`${'ERROR:'.red}  Failed to setup update notifier. err: ${err}`);
  }
}
