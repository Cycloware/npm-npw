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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZUVuY29kZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvbGluZUVuY29kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBYSxRQUFBLGFBQWEsR0FBRztJQUMzQixFQUFFLEVBQUUsS0FBSztJQUNULEVBQUUsRUFBRSxLQUFLO0lBQ1QsSUFBSSxFQUFFLE9BQU87Q0FDZCxDQUFBO0FBRVksUUFBQSxjQUFjLEdBQUc7SUFDNUIsRUFBRSxFQUFFLElBQUk7SUFDUixFQUFFLEVBQUUsSUFBSTtJQUNSLElBQUksRUFBRSxNQUFNO0NBQ2IsQ0FBQTtBQUVZLFFBQUEsZ0JBQWdCLEdBQUc7SUFDOUIsSUFBSSxFQUFFLElBQW9CO0lBQzFCLElBQUksRUFBRSxJQUFvQjtJQUMxQixNQUFNLEVBQUUsTUFBc0I7Q0FDL0IsQ0FBQztBQUVXLFFBQUEsY0FBYyxHQUFtQixDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFFbkUsd0NBQStDLEtBQWE7SUFDMUQsTUFBTSxhQUFhLEdBQUcsQ0FBQyxPQUFPLEtBQUssS0FBSyxRQUFRLEdBQUcsS0FBSyxHQUFHLEVBQUUsQ0FBQyxDQUFDLFdBQVcsRUFBa0IsQ0FBQztJQUU3RixFQUFFLENBQUMsQ0FBQyxzQkFBYyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sQ0FBQyxTQUFTLENBQUM7SUFDbkIsQ0FBQztJQUNELElBQUksQ0FBQyxDQUFDO1FBQ0osTUFBTSxDQUFDLGFBQWEsQ0FBQztJQUN2QixDQUFDO0FBQ0gsQ0FBQztBQVRELHdFQVNDO0FBUUQsdUJBQThCLE9BQWU7SUFDM0MsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUMxQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ1YsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2xDLE1BQU0sUUFBUSxHQUFHLHdCQUFnQixDQUFDLFFBQXdCLENBQUMsQ0FBQztRQUM1RCxNQUFNLENBQUMsUUFBUSxDQUFDO0lBQ2xCLENBQUM7SUFDRCxNQUFNLENBQUMsSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQVJELHNDQVFDO0FBV0QsdUJBQThCLE9BQWUsRUFBRSxVQUFrQjtJQUMvRCxNQUFNLGlCQUFpQixHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNqRCxFQUFFLENBQUMsQ0FBQyxpQkFBaUIsS0FBSyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQztZQUNMLFVBQVUsRUFBRSxLQUFLO1lBQ2pCLE9BQU8sRUFBRSxLQUFLO1lBQ2QsS0FBSyxFQUFFLE9BQU87WUFDZCxhQUFhLEVBQUUsaUJBQWlCO1lBQ2hDLE1BQU0sRUFBRSxPQUFPO1lBQ2YsY0FBYyxFQUFFLFVBQVU7U0FDM0IsQ0FBQztJQUNKLENBQUM7SUFFRCxFQUFFLENBQUMsQ0FBQyxpQkFBaUIsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQy9CLE1BQU0sQ0FBQztZQUNMLFVBQVUsRUFBRSxJQUFJO1lBQ2hCLE9BQU8sRUFBRSxLQUFLO1lBQ2QsS0FBSyxFQUFFLE9BQU87WUFDZCxhQUFhLEVBQUUsaUJBQWlCO1lBQ2hDLE1BQU0sRUFBRSxPQUFPO1lBQ2YsY0FBYyxFQUFFLGlCQUFpQjtTQUNsQyxDQUFDO0lBQ0osQ0FBQztJQUVELE1BQU0sT0FBTyxHQUFHLHFCQUFhLENBQUMsaUJBQWlDLENBQUMsQ0FBQztJQUNqRSxNQUFNLGFBQWEsR0FBRyxzQkFBYyxDQUFDLFVBQTBCLENBQUMsQ0FBQztJQUNqRSxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQztJQUN2RCxNQUFNLENBQUM7UUFDTCxVQUFVLEVBQUUsS0FBSztRQUNqQixPQUFPLEVBQUUsSUFBSTtRQUNiLEtBQUssRUFBRSxPQUFPO1FBQ2QsYUFBYSxFQUFFLGlCQUFpQjtRQUNoQyxNQUFNLEVBQUUsTUFBTTtRQUNkLGNBQWMsRUFBRSxVQUEwQjtLQUMzQyxDQUFDO0FBQ0osQ0FBQztBQW5DRCxzQ0FtQ0M7QUFBQSxDQUFDIn0=