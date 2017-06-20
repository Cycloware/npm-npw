export const endingToRegEx = {
  CR: /\r/g,
  LF: /\n/g,
  CRLF: /\r\n/g
}

export const endingToString = {
  CR: '\r',
  LF: '\n',
  CRLF: '\r\n'
}

export const lineEndingToType = {
  '\r': 'CR' as TMatcherKeys,
  '\n': 'LF' as TMatcherKeys,
  '\r\n': 'CRLF' as TMatcherKeys,
};

export const validLineModes: TMatcherKeys[] = ['CRLF', 'LF', 'CR'];

export function coearceLineModeFromInputString(input: string) {
  const upperLineMode = (typeof input === 'string' ? input : '').toUpperCase() as TMatcherKeys;

  if (validLineModes.indexOf(upperLineMode) < 0) {
    return undefined;
  }
  else {
    return upperLineMode;
  }
}


type TLineEndings = (keyof typeof lineEndingToType);
export type TMatcherKeys = (keyof typeof endingToString) | (keyof typeof endingToString);

export type TEndingTypes = TMatcherKeys | 'NA';

export function getLineEnding(content: string) : TEndingTypes {
  const match = content.match(/\r\n|\r|\n/);
  if (match) {
    const matchVal = match.toString();
    const lineType = lineEndingToType[matchVal as TLineEndings];
    return lineType;
  }
  return 'NA';
}

export type TSetLineEndingResult = {
  noEncoding: boolean,
  changed: boolean,
  input: string,
  inputEncoding: TEndingTypes,
  output: string,
  outputEncoding: TEndingTypes,
};

export function setLineEnding(content: string, endingType: string) : TSetLineEndingResult {
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

  const matcher = endingToRegEx[currentEndingType as TMatcherKeys];
  const endingTypeStr = endingToString[endingType as TMatcherKeys];
  const output = content.replace(matcher, endingTypeStr);
  return {
    noEncoding: false,
    changed: true,
    input: content,
    inputEncoding: currentEndingType,
    output: output,
    outputEncoding: endingType as TMatcherKeys,
  };
};
