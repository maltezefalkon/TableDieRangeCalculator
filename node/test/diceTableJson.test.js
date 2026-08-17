'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { Die } = require('../src/die');
const { Dice } = require('../src/dice');
const { DiceTable } = require('../src/diceTable');
const { parseTableJson, Color, WeightedEntry, Temple } = require('./helpers');

test('toJson on a complex entry type does not throw', () => {
  // Regression test: the C# DiceTable<Temple> is a Dictionary<Temple, ...>, and
  // serializing that directly used to throw, because Temple isn't a type
  // System.Text.Json can use as a dictionary key. toJson() must sidestep that by
  // projecting into a DTO before serializing.
  const temples = Temple.getAll();
  const table = new DiceTable(temples, (t) => t.weight, Die.d12);

  const dto = parseTableJson(table.toJson());

  assert.ok(dto);
  assert.strictEqual(dto.Ranges.length, temples.length);
});

test('toJson top-level fields match the dice', () => {
  const dice = new Dice('3d6');
  const entries = [new WeightedEntry('A', 1), new WeightedEntry('B', 1)];
  const table = new DiceTable(entries, (e) => e.weight, dice);

  const dto = parseTableJson(table.toJson());

  assert.strictEqual(dto.Dice, dice.toString());
  assert.strictEqual(dto.Min, dice.minRoll);
  assert.strictEqual(dto.Max, dice.maxRoll);
});

test('toJson ranges match the source table exactly', () => {
  const entries = [
    new WeightedEntry('Common', 7),
    new WeightedEntry('Uncommon', 5),
    new WeightedEntry('Rare', 2),
  ];
  const table = new DiceTable(entries, (e) => e.weight, Die.d20);

  const dto = parseTableJson(table.toJson());

  assert.strictEqual(dto.Ranges.length, table.count);
  for (const entry of entries) {
    const range = table.get(entry);
    const matching = dto.Ranges.filter((r) => r.Entry === entry.name);

    assert.strictEqual(matching.length, 1);
    assert.strictEqual(matching[0].Min, range.minRoll);
    assert.strictEqual(matching[0].Max, range.maxRoll);
    assert.strictEqual(matching[0].Range, range.writeRange());
    assert.ok(matching[0].TargetWeight.equals(range.targetWeight));
    assert.ok(matching[0].AssignedWeight.equals(range.assignedWeight));
  }
});

test('toJson on a percentile die zero-pads ranges and uses 00 for one hundred', () => {
  // 4 equal-weight entries on d100 split evenly into 1-25, 26-50, 51-75, 76-100 -
  // the interesting part here is that toJson() must go through
  // PercentileDiceRange's polymorphic writeRange() override, not the plain
  // DiceRange base, since the DTO field is populated via writeRange() with no
  // percentile flag of its own.
  const colors = Color.getAll();
  const table = new DiceTable(colors, (c) => c.weight, Die.d100);

  const dto = parseTableJson(table.toJson());

  assert.ok(dto.Ranges.some((r) => r.Range === '01-25'));
  assert.ok(dto.Ranges.some((r) => r.Range === '76-00')); // 100 renders as "00", not "100"
  for (const range of dto.Ranges) {
    assert.match(range.Range, /^\d{2}(-\d{2})?$/);
  }
});

test('toJson on a non-percentile die does not zero-pad', () => {
  const entries = [new WeightedEntry('A', 1), new WeightedEntry('B', 1)];
  const table = new DiceTable(entries, (e) => e.weight, Die.d12);

  const dto = parseTableJson(table.toJson());

  for (const range of dto.Ranges) {
    assert.doesNotMatch(range.Range, /^0\d/);
  }
});

test('toJson on a multi-die pool is not treated as percentile even if the range is 1-100', () => {
  // isPercentile() specifically requires a SINGLE die, not just a minRoll/maxRoll
  // of 1/100 - a multi-die pool that happens to span 1-100 should not get
  // zero-padded percentile formatting.
  const dice = new Dice(Die.d100, Die.d100); // not percentile: two dice, range 2-200
  const entries = [new WeightedEntry('A', 1), new WeightedEntry('B', 1)];
  const table = new DiceTable(entries, (e) => e.weight, dice);

  const dto = parseTableJson(table.toJson());

  for (const range of dto.Ranges) {
    assert.doesNotMatch(range.Range, /^0\d/);
  }
});

test('toJson ranges cover the full die range with no gaps or overlaps', () => {
  const dice = new Dice('2d8');
  const entries = [
    new WeightedEntry('A', 3),
    new WeightedEntry('B', 2),
    new WeightedEntry('C', 1),
  ];
  const table = new DiceTable(entries, (e) => e.weight, dice);

  const dto = parseTableJson(table.toJson());
  const sorted = [...dto.Ranges].sort((a, b) => a.Min - b.Min);

  assert.strictEqual(sorted[0].Min, dice.minRoll);
  assert.strictEqual(sorted[sorted.length - 1].Max, dice.maxRoll);
  for (let i = 1; i < sorted.length; i++) {
    assert.strictEqual(sorted[i].Min, sorted[i - 1].Max + 1);
  }
});

test('toJson uses the entry toString for the entry field', () => {
  const entries = [new WeightedEntry('Sun / Law', 1)];
  const table = new DiceTable(entries, (e) => e.weight, Die.d6);

  const dto = parseTableJson(table.toJson());

  assert.strictEqual(dto.Ranges.length, 1);
  assert.strictEqual(dto.Ranges[0].Entry, 'Sun / Law');
});

test('toJson uses PascalCase property names', () => {
  // Pins the wire format callers (e.g. a skill script parsing this JSON) will
  // build against - if a naming policy (like camelCase) ever gets added, this
  // should fail loudly rather than silently break consumers.
  const entries = [new WeightedEntry('A', 1)];
  const table = new DiceTable(entries, (e) => e.weight, Die.d6);

  const json = table.toJson();

  for (const field of ['Dice', 'Min', 'Max', 'Ranges', 'Entry', 'Range', 'TargetWeight', 'AssignedWeight']) {
    assert.ok(json.includes(`"${field}":`), `expected "${field}": in output`);
  }
});

test('toJson with a flat modifier reflects the shift in top-level min/max and stays consistent', () => {
  // End-to-end regression for the modifier feature specifically as it flows
  // through to the actual CLI output - top-level Min/Max must include the
  // modifier, and every range must fall inside that shifted window.
  const dice = new Dice('3d12+2'); // Min=5, Max=38
  const entries = [new WeightedEntry('A', 1), new WeightedEntry('B', 1)];
  const table = new DiceTable(entries, (e) => e.weight, dice);

  const dto = parseTableJson(table.toJson());

  assert.strictEqual(dto.Min, 5);
  assert.strictEqual(dto.Max, 38);
  for (const range of dto.Ranges) {
    assert.ok(range.Min >= 5 && range.Max <= 38);
  }
});
