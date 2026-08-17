'use strict';

// A minimal JSON reader that hands back number literals as text rather than JS
// doubles. The .NET tool binds weights straight into System.Decimal from the
// literal, so a weight like 0.123456789012345678 keeps all its digits there;
// routing it through a double first would quietly truncate it.

const NUMBER = Symbol('jsonNumber');

function jsonNumberText(value) {
  return value !== null && typeof value === 'object' && NUMBER in value ? value[NUMBER] : null;
}

class JsonError extends Error {
  constructor(message) {
    super(message);
    this.name = 'JsonError';
  }
}

function parse(text) {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  let pos = 0;

  function fail(message) {
    throw new JsonError(`${message} Path: $ | LineNumber: 0 | BytePositionInLine: ${pos}.`);
  }

  function skipWhitespace() {
    while (pos < source.length && (source[pos] === ' ' || source[pos] === '\t' || source[pos] === '\n' || source[pos] === '\r')) {
      pos++;
    }
  }

  function expect(char) {
    if (source[pos] !== char) fail(`'${char}' is invalid after a value.`);
    pos++;
  }

  function parseValue() {
    skipWhitespace();
    if (pos >= source.length) fail('Expected end of string, but instead reached end of data.');
    const char = source[pos];
    if (char === '{') return parseObject();
    if (char === '[') return parseArray();
    if (char === '"') return parseString();
    if (source.startsWith('true', pos)) return (pos += 4), true;
    if (source.startsWith('false', pos)) return (pos += 5), false;
    if (source.startsWith('null', pos)) return (pos += 4), null;
    return parseNumber();
  }

  function parseObject() {
    pos++;
    const result = new Map();
    skipWhitespace();
    if (source[pos] === '}') return pos++, result;
    for (;;) {
      skipWhitespace();
      const key = parseString();
      skipWhitespace();
      expect(':');
      result.set(key, parseValue());
      skipWhitespace();
      if (source[pos] === ',') {
        pos++;
        continue;
      }
      expect('}');
      return result;
    }
  }

  function parseArray() {
    pos++;
    const result = [];
    skipWhitespace();
    if (source[pos] === ']') return pos++, result;
    for (;;) {
      result.push(parseValue());
      skipWhitespace();
      if (source[pos] === ',') {
        pos++;
        continue;
      }
      expect(']');
      return result;
    }
  }

  function parseString() {
    if (source[pos] !== '"') fail(`'${source[pos]}' is an invalid start of a value.`);
    pos++;
    let out = '';
    while (pos < source.length) {
      const char = source[pos];
      if (char === '"') {
        pos++;
        return out;
      }
      if (char === '\\') {
        pos++;
        const escape = source[pos++];
        if (escape === 'u') {
          out += String.fromCharCode(parseInt(source.slice(pos, pos + 4), 16));
          pos += 4;
        } else {
          const simple = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' }[escape];
          if (simple === undefined) fail(`'${escape}' is an invalid escapable character within a JSON string.`);
          out += simple;
        }
      } else {
        out += char;
        pos++;
      }
    }
    fail('Expected end of string, but instead reached end of data.');
  }

  function parseNumber() {
    const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(source.slice(pos));
    if (match === null) fail(`'${source[pos]}' is an invalid start of a value.`);
    pos += match[0].length;
    return { [NUMBER]: match[0] };
  }

  const value = parseValue();
  skipWhitespace();
  if (pos !== source.length) fail(`'${source[pos]}' is invalid after a single JSON value.`);
  return value;
}

// System.Text.Json runs with PropertyNameCaseInsensitive here, so "dice" and "Dice"
// both bind.
function getProperty(map, name) {
  if (!(map instanceof Map)) return undefined;
  const lowered = name.toLowerCase();
  for (const [key, value] of map) {
    if (key.toLowerCase() === lowered) return value;
  }
  return undefined;
}

module.exports = { parse, getProperty, jsonNumberText, JsonError };
