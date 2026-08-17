'use strict';

const { Decimal } = require('./decimal');
const { getProperty, jsonNumberText } = require('./jsonReader');
const { ArgumentError } = require('./errors');

// Mirrors `record InputTableEntryDto(string Entry, decimal Weight)`: value
// equality over both members, and ToString() returning just the entry text.
class InputTableEntry {
  constructor(entry, weight) {
    this.entry = entry;
    this.weight = weight;
  }

  equals(other) {
    return other instanceof InputTableEntry && other.entry === this.entry && other.weight.equals(this.weight);
  }

  toString() {
    return this.entry;
  }
}

function readString(container, name) {
  const value = getProperty(container, name);
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new ArgumentError(`The JSON value could not be converted to System.String. Path: $.${name}`);
  }
  return value;
}

function readDecimal(container, name) {
  const value = getProperty(container, name);
  if (value === undefined || value === null) return Decimal.ZERO;
  const text = jsonNumberText(value);
  if (text === null) {
    throw new ArgumentError(`The JSON value could not be converted to System.Decimal. Path: $.${name}`);
  }
  return Decimal.parse(text);
}

function bindInputTable(parsed) {
  const entriesValue = getProperty(parsed, 'entries');
  let entries = null;
  if (entriesValue !== undefined && entriesValue !== null) {
    if (!Array.isArray(entriesValue)) {
      throw new ArgumentError('The JSON value could not be converted to InputTableEntryDto[]. Path: $.entries');
    }
    entries = entriesValue.map((item) => {
      if (!(item instanceof Map)) {
        throw new ArgumentError('The JSON value could not be converted to InputTableEntryDto. Path: $.entries');
      }
      return new InputTableEntry(readString(item, 'entry'), readDecimal(item, 'weight'));
    });
  }

  return {
    name: readString(parsed, 'name'),
    dice: readString(parsed, 'dice'),
    entries,
  };
}

module.exports = { InputTableEntry, bindInputTable };
