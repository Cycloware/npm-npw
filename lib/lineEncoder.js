"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.endingToRegEx = {
    CR: /\r/g,
    LF: /\n/g,
    CRLF: /\r\n/g
};
exports.endingToString = {
    CR: '\r',
    LF: '\n',
    CRLF: '\r\n'
};
exports.lineEndingToType = {
    '\r': 'CR',
    '\n': 'LF',
    '\r\n': 'CRLF',
};
exports.validLineModes = ['CRLF', 'LF', 'CR'];
function coearceLineModeFromInputString(input) {
    const upperLineMode = (typeof input === 'string' ? input : '').toUpperCase();
    if (exports.validLineModes.indexOf(upperLineMode) < 0) {
        return undefined;
    }
    else {
        return upperLineMode;
    }
}
exports.coearceLineModeFromInputString = coearceLineModeFromInputString;
function getLineEnding(content) {
    const match = content.match(/\r\n|\r|\n/);
    if (match) {
        const matchVal = match.toString();
        const lineType = exports.lineEndingToType[matchVal];
        return lineType;
    }
    return 'NA';
}
exports.getLineEnding = getLineEnding;
function setLineEnding(content, endingType) {
    const currentEndingType = getLineEnding(content);
    if (currentEndingType === endingType) {
        return {
            noEncoding: false,
            changed: false,
            input: content,
            inputEncoding: currentEndingType,
            output: content,
            outputEncoding: endingType,
        };
    }
    if (currentEndingType === 'NA') {
        return {
            noEncoding: true,
            changed: false,
            input: content,
            inputEncoding: currentEndingType,
            output: content,
            outputEncoding: currentEndingType,
        };
    }
    const matcher = exports.endingToRegEx[currentEndingType];
    const endingTypeStr = exports.endingToString[endingType];
    const output = content.replace(matcher, endingTypeStr);
    return {
        noEncoding: false,
        changed: true,
        input: content,
        inputEncoding: currentEndingType,
        output: output,
        outputEncoding: endingType,
    };
}
exports.setLineEnding = setLineEnding;
;
