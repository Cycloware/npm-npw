'use strict';

function getLineEnding(content) {
  var matched = content.match(/\r\n|\r|\n/);
  var returned = {
    '\r': 'CR',
    '\n': 'LF',
    '\r\n': 'CRLF',
  }[matched];
  if (matched) {
    return returned;
  }
  return 'NA';
};

function setLineEnding(content, endingType) {
  var currentEndingType = getLineEnding(content);
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

  var matcher = {
    CR: /\r/g,
    LF: /\n/g,
    CRLF: /\r\n/g
  }[currentEndingType];
  var endingTypeStr = {
    CR: '\r',
    LF: '\n',
    CRLF: '\r\n'
  }[endingType];
  const output = content.replace(matcher, endingTypeStr);
  return {
    noEncoding: false,
    changed: true,
    input: content,
    inputEncoding: currentEndingType,
    output: output,
    outputEncoding: endingType,
  };
};

module.exports = setLineEnding;
module.exports.getLineEnding = getLineEnding;
