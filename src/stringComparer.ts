export namespace stringComparer {
  export function Sensitive(x: string, y: string) { return x === y };
  export function Insensitive(x: string, y: string) { return x.toLowerCase() === y.toLowerCase(); }

  export function get(caseSensitive: boolean) { return caseSensitive ? Sensitive : Insensitive; }
}
