"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const funcArrayPush = Array.prototype.push;
function pushArray(target, array) {
    return funcArrayPush.apply(target, array);
}
exports.pushArray = pushArray;
