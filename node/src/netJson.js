'use strict';

const os = require('os');

// System.Text.Json output, not JSON.stringify output. Two things differ and both
// are visible in the bytes callers compare against: the default JavaScriptEncoder
// escapes a wider set than the spec requires (non-ASCII plus & ' + < > `) using
// uppercase hex, and WriteIndented breaks lines with Environment.NewLine.

const RAW = Symbol('rawNumber');

function rawNumber(value) {
  return { [RAW]: typeof value === 'number' ? String(value) : value.toString() };
}

const SHORT_ESCAPES = new Map([
  [0x08, '\\b'],
  [0x09, '\\t'],
  [0x0a, '\\n'],
  [0x0c, '\\f'],
  [0x0d, '\\r'],
  [0x5c, '\\\\'],
]);

const ALWAYS_ESCAPED = new Set([
  0x22, // "
  0x26, // &
  0x27, // '
  0x2b, // +
  0x3c, // <
  0x3e, // >
  0x60, // `
]);

function escapeString(text) {
  let out = '"';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const short = SHORT_ESCAPES.get(code);
    if (short !== undefined) {
      out += short;
    } else if (code < 0x20 || code > 0x7e || ALWAYS_ESCAPED.has(code)) {
      out += '\\u' + code.toString(16).toUpperCase().padStart(4, '0');
    } else {
      out += text[i];
    }
  }
  return out + '"';
}

function write(value, indent) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'object' && RAW in value) return value[RAW];
  if (typeof value === 'string') return escapeString(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';

  const inner = indent + '  ';
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map((item) => inner + write(item, inner));
    return '[' + os.EOL + items.join(',' + os.EOL) + os.EOL + indent + ']';
  }

  const keys = Object.keys(value);
  if (keys.length === 0) return '{}';
  const props = keys.map((key) => `${inner}${escapeString(key)}: ${write(value[key], inner)}`);
  return '{' + os.EOL + props.join(',' + os.EOL) + os.EOL + indent + '}';
}

function serialize(value) {
  return write(value, '');
}

module.exports = { serialize, rawNumber, escapeString };
