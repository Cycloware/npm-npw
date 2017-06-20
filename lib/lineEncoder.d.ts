export declare const endingToRegEx: {
    CR: RegExp;
    LF: RegExp;
    CRLF: RegExp;
};
export declare const endingToString: {
    CR: string;
    LF: string;
    CRLF: string;
};
export declare const lineEndingToType: {
    '\r': "CR" | "LF" | "CRLF";
    '\n': "CR" | "LF" | "CRLF";
    '\r\n': "CR" | "LF" | "CRLF";
};
export declare const validLineModes: TMatcherKeys[];
export declare function coearceLineModeFromInputString(input: string): "CR" | "LF" | "CRLF";
export declare type TMatcherKeys = (keyof typeof endingToString) | (keyof typeof endingToString);
export declare type TEndingTypes = TMatcherKeys | 'NA';
export declare function getLineEnding(content: string): TEndingTypes;
export declare type TSetLineEndingResult = {
    noEncoding: boolean;
    changed: boolean;
    input: string;
    inputEncoding: TEndingTypes;
    output: string;
    outputEncoding: TEndingTypes;
};
export declare function setLineEnding(content: string, endingType: string): TSetLineEndingResult;
