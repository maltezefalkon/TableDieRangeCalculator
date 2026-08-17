'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { Decimal } = require('../src/decimal');
const { Die } = require('../src/die');
const { Dice } = require('../src/dice');
const { DiceTable } = require('../src/diceTable');
const { ArgumentError } = require('../src/errors');
const { dec, assertDecimalEqual, Color, WeightedEntry } = require('./helpers');

test('dice table splits four equal-weight entries evenly across d100', () => {
  const diceTable = new DiceTable(Color.getAll(), (c) => c.weight, Die.d100);
  for (const { value } of diceTable) {
    assertDecimalEqual(dec('0.25'), value.assignedWeight);
  }
  assert.strictEqual(diceTable.elementAt(0).value.minRoll, 1);
  assert.strictEqual(diceTable.elementAt(0).value.maxRoll, 25);
  assert.strictEqual(diceTable.elementAt(1).value.minRoll, 26);
  assert.strictEqual(diceTable.elementAt(1).value.maxRoll, 50);
  assert.strictEqual(diceTable.elementAt(2).value.minRoll, 51);
  assert.strictEqual(diceTable.elementAt(2).value.maxRoll, 75);
  assert.strictEqual(diceTable.elementAt(3).value.minRoll, 76);
  assert.strictEqual(diceTable.elementAt(3).value.maxRoll, 100);
});

test('dice table splits four equal-weight entries evenly across d12', () => {
  const diceTable = new DiceTable(Color.getAll(), (c) => c.weight, Die.d12);
  for (const { value } of diceTable) {
    assertDecimalEqual(dec('0.25'), value.assignedWeight, 8);
  }
  assert.strictEqual(diceTable.elementAt(0).value.minRoll, 1);
  assert.strictEqual(diceTable.elementAt(0).value.maxRoll, 3);
  assert.strictEqual(diceTable.elementAt(1).value.minRoll, 4);
  assert.strictEqual(diceTable.elementAt(1).value.maxRoll, 6);
  assert.strictEqual(diceTable.elementAt(2).value.minRoll, 7);
  assert.strictEqual(diceTable.elementAt(2).value.maxRoll, 9);
  assert.strictEqual(diceTable.elementAt(3).value.minRoll, 10);
  assert.strictEqual(diceTable.elementAt(3).value.maxRoll, 12);
});

// Every entry's range must be inside the die's bounds, every range must be
// non-empty, and laid out by ascending minRoll they must tile [dice.minRoll,
// dice.maxRoll] exactly - no gaps, no overlaps, nothing left over. This is the
// single invariant that would have caught nearly every bug found while building
// this class (dropped entries, duplicated ranges, mis-walked backtracking, etc).
function assertFullContiguousCoverage(table, dice) {
  const ranges = [...table.values].sort((a, b) => a.minRoll - b.minRoll);

  assert.strictEqual(ranges.length, table.count);
  assert.strictEqual(ranges[0].minRoll, dice.minRoll);
  assert.strictEqual(ranges[ranges.length - 1].maxRoll, dice.maxRoll);

  for (let i = 0; i < ranges.length; i++) {
    assert.ok(
      ranges[i].minRoll <= ranges[i].maxRoll,
      `${ranges[i].entry}: minRoll (${ranges[i].minRoll}) > maxRoll (${ranges[i].maxRoll})`
    );
    assert.ok(
      ranges[i].minRoll >= dice.minRoll && ranges[i].maxRoll <= dice.maxRoll,
      `${ranges[i].entry}: range falls outside ${dice.minRoll}-${dice.maxRoll}`
    );
    if (i > 0) {
      assert.strictEqual(ranges[i].minRoll, ranges[i - 1].maxRoll + 1);
    }
  }
}

test('too many entries for the die throws', () => {
  const entries = ['A', 'B', 'C', 'D', 'E']; // 5 entries, only 4 possible results
  assert.throws(() => new DiceTable(entries, () => Decimal.ONE, Die.d4), ArgumentError);
});

test('a single entry claims the entire range', () => {
  const entries = [new WeightedEntry('Only', 1)];
  const table = new DiceTable(entries, (e) => e.weight, Die.d20);

  assertFullContiguousCoverage(table, new Dice(Die.d20));
  assert.strictEqual(table.get(entries[0]).minRoll, 1);
  assert.strictEqual(table.get(entries[0]).maxRoll, 20);
});

test('a single die preserves input order', () => {
  // With only one die, DiceTable skips both the brute-force and zig-zag reordering
  // steps entirely - entries should come out in exactly the order they went in,
  // regardless of how different their weights are.
  const entries = [
    new WeightedEntry('A', 4),
    new WeightedEntry('B', 3),
    new WeightedEntry('C', 2),
    new WeightedEntry('D', 1),
  ];
  const table = new DiceTable(entries, (e) => e.weight, Die.d10);

  assertFullContiguousCoverage(table, new Dice(Die.d10));
  assert.ok(table.get(entries[0]).maxRoll < table.get(entries[1]).minRoll);
  assert.ok(table.get(entries[1]).maxRoll < table.get(entries[2]).minRoll);
  assert.ok(table.get(entries[2]).maxRoll < table.get(entries[3]).minRoll);
});

test('assigned weight always matches the true probability of its own range', () => {
  // Whatever ranges the optimizer settles on, assignedWeight must equal the true
  // probability mass of exactly that range - cross-checked here against the known
  // 2d6 distribution independently of anything DiceTable computed.
  const entries = [
    new WeightedEntry('Low', 1),
    new WeightedEntry('Mid', 1),
    new WeightedEntry('High', 1),
  ];
  const dice = new Dice('2d6');
  const table = new DiceTable(entries, (e) => e.weight, dice);
  const trueDistribution = dice.getDistribution();

  assertFullContiguousCoverage(table, dice);
  for (const entry of entries) {
    const range = table.get(entry);
    let expectedWeight = Decimal.ZERO;
    for (let v = range.minRoll; v <= range.maxRoll; v++) {
      expectedWeight = expectedWeight.add(trueDistribution.get(v));
    }
    assertDecimalEqual(expectedWeight, range.assignedWeight, 10);
  }
});

test('equal weights on a bell-curve die beat a naive width-based split', () => {
  // 2d6 (range 2-12) split three ways by equal weight, with only 11 possible
  // values and a peak (a roll of 7) worth 6/36 ~= 16.7% on its own - an exact
  // three-way even split isn't achievable. Rather than guess what the optimal
  // partition looks like, this proves the optimizer's result is genuinely
  // probability-aware by comparing it against a naive width-based split (just
  // chopping 2-12 into three equal-width chunks, ignoring probability entirely):
  // since DiceTable is provably optimal for whatever ordering it settles on, its
  // total squared deviation from the 1/3 target can never be worse than the naive
  // split's, and for this die it should be strictly better.
  const dice = new Dice('2d6');
  const trueDistribution = dice.getDistribution();
  const target = Decimal.ONE.divide(dec(3));

  const entries = [
    new WeightedEntry('Low', 1),
    new WeightedEntry('Mid', 1),
    new WeightedEntry('High', 1),
  ];
  const table = new DiceTable(entries, (e) => e.weight, dice);
  const actualDeviation = table.values.reduce((sum, r) => {
    const delta = r.assignedWeight.subtract(target);
    return sum.add(delta.multiply(delta));
  }, Decimal.ZERO);

  // Naive: chop the 11 values (2-12) into three contiguous, equal-width-as-possible
  // chunks without looking at probability at all.
  const sortedRollValues = [...trueDistribution.keys()].sort((a, b) => a - b);
  const naiveChunkSize = Math.ceil(sortedRollValues.length / 3);
  let naiveDeviation = Decimal.ZERO;
  for (let start = 0; start < sortedRollValues.length; start += naiveChunkSize) {
    const chunk = sortedRollValues.slice(start, start + naiveChunkSize);
    const chunkWeight = chunk.reduce((sum, v) => sum.add(trueDistribution.get(v)), Decimal.ZERO);
    const delta = chunkWeight.subtract(target);
    naiveDeviation = naiveDeviation.add(delta.multiply(delta));
  }

  assert.ok(
    actualDeviation.lessThan(naiveDeviation),
    `Optimized deviation (${actualDeviation}) was not better than naive width-based deviation (${naiveDeviation})`
  );
});

test('skewed weights with many entries take the zig-zag path and cover fully with no drops', () => {
  // Regression test for the bug where entries with small weights got silently
  // dropped (assigned no range at all) once entry count got close to the die's
  // range and the algorithm was forced through the zig-zag heuristic path (more
  // than MAX_BRUTE_FORCE_ENTRIES entries). Common/Uncommon/Rare-style weight
  // tiers, mirroring the original city-building dataset that surfaced it.
  const entries = [];
  for (let i = 0; i < 10; i++) entries.push(new WeightedEntry(`Common${i}`, 7));
  for (let i = 0; i < 10; i++) entries.push(new WeightedEntry(`Uncommon${i}`, 5));
  for (let i = 0; i < 10; i++) entries.push(new WeightedEntry(`Rare${i}`, 2));

  const dice = new Dice('8d20'); // deliberately lumpy, symmetric, unimodal
  const table = new DiceTable(entries, (e) => e.weight, dice);

  assertFullContiguousCoverage(table, dice);
  assert.strictEqual(table.count, entries.length);
  assertDecimalEqual(Decimal.ONE, table.values.reduce((s, r) => s.add(r.assignedWeight), Decimal.ZERO), 6);
});

test('skewed weights with few entries take the brute-force path and cover fully', () => {
  // Entry count at/under MAX_BRUTE_FORCE_ENTRIES takes the brute-force-ordering
  // path instead of zig-zag - same coverage guarantees should hold there too.
  const entries = [
    new WeightedEntry('Common', 7),
    new WeightedEntry('Uncommon', 5),
    new WeightedEntry('Rare', 2),
  ];
  const dice = new Dice('3d6');
  const table = new DiceTable(entries, (e) => e.weight, dice);

  assertFullContiguousCoverage(table, dice);
  assertDecimalEqual(Decimal.ONE, table.values.reduce((s, r) => s.add(r.assignedWeight), Decimal.ZERO), 6);
});

test('a heterogeneous dice pool covers fully', () => {
  const entries = [
    new WeightedEntry('A', 3),
    new WeightedEntry('B', 2),
    new WeightedEntry('C', 1),
  ];
  const dice = new Dice(Die.d4, Die.d6, Die.d8);
  const table = new DiceTable(entries, (e) => e.weight, dice);

  assertFullContiguousCoverage(table, dice);
});

test('unnormalized raw weights still produce probabilities summing to one', () => {
  // Weights don't need to be pre-normalized to sum to 1 - the constructor should
  // do that itself regardless of the raw scale callers pass in.
  const entries = [
    new WeightedEntry('A', 70),
    new WeightedEntry('B', 20),
    new WeightedEntry('C', 10),
  ];
  const table = new DiceTable(entries, (e) => e.weight, Die.d100);

  assertDecimalEqual(Decimal.ONE, table.values.reduce((s, r) => s.add(r.assignedWeight), Decimal.ZERO), 6);
  assert.ok(table.get(entries[0]).assignedWeight.greaterThan(table.get(entries[1]).assignedWeight));
  assert.ok(table.get(entries[1]).assignedWeight.greaterThan(table.get(entries[2]).assignedWeight));
});

test('a flat modifier on a single die covers the shifted range fully', () => {
  // Regression test: getDistribution() used to compute its offset without
  // including the flat modifier, so its keys landed in a different range than
  // minRoll/maxRoll (which do include it) - every weighted lookup inside the DP
  // indexed a key that didn't exist, and table construction threw for any modifier.
  const dice = new Dice('d100+5'); // minRoll=6, maxRoll=105
  const entries = [new WeightedEntry('A', 1), new WeightedEntry('B', 1)];
  const table = new DiceTable(entries, (e) => e.weight, dice);

  assertFullContiguousCoverage(table, dice);
});

test('a flat modifier on the multi-die zig-zag path covers the shifted range with no drops', () => {
  // Same regression as above, exercised through the zig-zag (>8 entries) ordering
  // path with a genuinely non-uniform (multi-die) distribution.
  const entries = [];
  for (let i = 0; i < 10; i++) entries.push(new WeightedEntry(`Common${i}`, 7));
  for (let i = 0; i < 10; i++) entries.push(new WeightedEntry(`Rare${i}`, 2));

  const dice = new Dice('8d20+10'); // minRoll=18, maxRoll=170
  const table = new DiceTable(entries, (e) => e.weight, dice);

  assertFullContiguousCoverage(table, dice);
  assert.strictEqual(table.count, entries.length);
});

test('a flat modifier does not break percentile detection in either direction', () => {
  // "d100+0" (net-zero modifier) should still be treated as percentile;
  // "d100+5" (real modifier, minRoll no longer 1) should not be.
  const zeroModEntries = [new WeightedEntry('A', 1), new WeightedEntry('B', 1)];
  const zeroModTable = new DiceTable(zeroModEntries, (e) => e.weight, new Dice('d100+0'));
  assert.ok(zeroModTable.values.some((r) => r.writeRange() === '01-50'));

  const shiftedEntries = [new WeightedEntry('A', 1), new WeightedEntry('B', 1)];
  const shiftedTable = new DiceTable(shiftedEntries, (e) => e.weight, new Dice('d100+5'));
  for (const range of shiftedTable.values) {
    assert.doesNotMatch(range.writeRange(), /^0\d/);
  }
});
