"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var stringComparer;
(function (stringComparer) {
    function Sensitive(x, y) { return x === y; }
    stringComparer.Sensitive = Sensitive;
    ;
    function Insensitive(x, y) { return x.toLowerCase() === y.toLowerCase(); }
    stringComparer.Insensitive = Insensitive;
    function get(caseSensitive) { return caseSensitive ? Sensitive : Insensitive; }
    stringComparer.get = get;
})(stringComparer = exports.stringComparer || (exports.stringComparer = {}));
