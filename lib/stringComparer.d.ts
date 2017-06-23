export declare namespace stringComparer {
    function Sensitive(x: string, y: string): boolean;
    function Insensitive(x: string, y: string): boolean;
    function get(caseSensitive: boolean): typeof Sensitive;
}
