'use strict';

const assert = require('node:assert');
const { Decimal } = require('../src/decimal');
const { parse, getProperty, jsonNumberText } = require('../src/jsonReader');

function dec(value) {
  return Decimal.parse(String(value));
}

// xunit's Assert.Equal(decimal, decimal, int precision) rounds both sides to
// `precision` decimal places (banker's rounding) before comparing.
function assertDecimalEqual(expected, actual, precision, message) {
  if (precision === undefined) {
    assert.ok(
      expected.equals(actual),
      message ?? `Expected ${expected.toString()} but got ${actual.toString()}`
    );
    return;
  }
  const e = expected.round(precision);
  const a = actual.round(precision);
  assert.ok(
    e.equals(a),
    message ?? `Expected ${expected.toString()} but got ${actual.toString()} (at ${precision} dp)`
  );
}

// Reads the tool's JSON back with decimals intact - JSON.parse would round the
// 28-digit weights through a double and break exact comparisons.
function parseTableJson(json) {
  const root = parse(json);
  const name = getProperty(root, 'Name');
  return {
    Name: name === undefined ? null : name,
    Dice: getProperty(root, 'Dice'),
    Min: Number(jsonNumberText(getProperty(root, 'Min'))),
    Max: Number(jsonNumberText(getProperty(root, 'Max'))),
    Ranges: getProperty(root, 'Ranges').map((range) => ({
      Entry: getProperty(range, 'Entry'),
      Min: Number(jsonNumberText(getProperty(range, 'Min'))),
      Max: Number(jsonNumberText(getProperty(range, 'Max'))),
      Range: getProperty(range, 'Range'),
      TargetWeight: Decimal.parse(jsonNumberText(getProperty(range, 'TargetWeight'))),
      AssignedWeight: Decimal.parse(jsonNumberText(getProperty(range, 'AssignedWeight'))),
    })),
  };
}

const allColors = new Map();

class Color {
  constructor(name, weight = Decimal.ONE) {
    this.name = name;
    this.weight = weight;
    allColors.set(name, this);
  }

  static getAll() {
    return [...allColors.values()];
  }

  equals(other) {
    return other !== null && other !== undefined && other.name === this.name;
  }

  toString() {
    return this.name;
  }
}

Color.Red = new Color('Red');
Color.Yellow = new Color('Yellow');
Color.Blue = new Color('Blue');
Color.Green = new Color('Green');

// A small, freely-constructible weighted entry - unlike Color (a fixed set of 4
// shared statics), this lets each test build exactly the entry count and weight
// distribution it needs without touching shared state.
class WeightedEntry {
  constructor(name, weight) {
    this.name = name;
    this.weight = weight instanceof Decimal ? weight : dec(weight);
  }

  equals(other) {
    return other !== null && other !== undefined && other.name === this.name;
  }

  toString() {
    return this.name;
  }
}

class Temple {
  constructor(names, weight = dec(5)) {
    this.names = names;
    this.weight = weight;
  }

  static getAll() {
    return [
      new Temple(['Sun', 'Law'], dec(9)),
      new Temple(['Moon', 'Secrets'], dec(3)),
      new Temple(['Love', 'Beauty', 'Family'], dec(6)),
      new Temple(['War', 'Chaos'], dec(5)),
      new Temple(['Knowledge', 'Craft'], dec(5)),
      new Temple(['Sea', 'Travel'], dec(5)),
      new Temple(['Harvest', 'Nature'], dec(11)),
      new Temple(['Death', 'Magic'], dec(2)),
    ];
  }

  equals(other) {
    return (
      other !== null &&
      other !== undefined &&
      other.names.length === this.names.length &&
      other.names.every((n, i) => n === this.names[i])
    );
  }

  toString() {
    return this.names.join('/');
  }
}

module.exports = { dec, assertDecimalEqual, parseTableJson, Color, WeightedEntry, Temple };
