const funcArrayPush = Array.prototype.push;


export function pushArray<T>(target: Array<T>, array: Array<T>) {
  return funcArrayPush.apply(target, array);
}

