"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const reg = /[\'\"]/;
function unquote(input) {
    if (!input) {
        return '';
    }
    if (reg.test(input.charAt(0))) {
        input = input.substr(1);
    }
    if (reg.test(input.charAt(input.length - 1))) {
        input = input.substr(0, input.length - 1);
    }
    return input;
}
exports.unquote = unquote;
