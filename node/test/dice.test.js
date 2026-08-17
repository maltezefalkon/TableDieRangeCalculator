'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { Decimal } = require('../src/decimal');
const { Die } = require('../src/die');
const { Dice } = require('../src/dice');
const { dec, assertDecimalEqual } = require('./helpers');

// ---- String parsing ----

const parseCases = [
  ['d6', 1, 6, 0],
  ['d20', 1, 20, 0],
  ['d%', 1, 100, 0],
  ['d100', 1, 100, 0],
  ['1d6', 1, 6, 0],
  ['3d6', 3, 18, 0],
  ['10d4', 10, 40, 0],
  ['2d100', 2, 200, 0],
  ['3d12+2', 5, 38, 2],
  ['d6+d8+1', 3, 15, 1],
];

for (const [dieString, expectedMin, expectedMax, expectedModifier] of parseCases) {
  test(`constructor parses die string '${dieString}' to expected range`, () => {
    const dice = new Dice(dieString);
    assert.strictEqual(dice.minRoll, expectedMin);
    assert.strictEqual(dice.maxRoll, expectedMax);
    assert.strictEqual(dice.modifier, expectedModifier);
  });
}

for (const dieString of ['', 'banana', 'd', 'd0']) {
  test(`constructor rejects unparseable die string '${dieString}'`, () => {
    // "d0" parses the regex fine but getDie("d0") should fail to resolve to a
    // known die - included here as a guard against silently accepting garbage.
    assert.throws(() => new Dice(dieString));
  });
}

for (const dieString of ['3d6-2', 'd20-5']) {
  test(`constructor rejects negative modifier '${dieString}' instead of silently dropping it`, () => {
    // Regex matching finds a pattern ANYWHERE in the string, not just at the
    // start - "3d6-2" used to "successfully" match just the "3d6" portion and
    // silently discard the "-2" instead of rejecting the term. That's worse than
    // failing: it returns a confidently wrong die pool with no signal anything
    // was ignored. Negative modifiers aren't supported (yet) - the important
    // thing tested here is that the failure is loud, not silent.
    assert.throws(() => new Dice(dieString));
  });
}

test('constructor accumulates multiple modifier terms', () => {
  const dice = new Dice('d6+d8+1+2');
  assert.strictEqual(dice.modifier, 3); // 1 + 2
  assert.strictEqual(dice.minRoll, 5); // (1+1) + 3
  assert.strictEqual(dice.maxRoll, 17); // (6+8) + 3
});

test('constructor sums min and max across a heterogeneous dice pool', () => {
  const dice = new Dice(Die.d4, Die.d6, Die.d8);
  assert.strictEqual(dice.minRoll, 3); // 1 + 1 + 1
  assert.strictEqual(dice.maxRoll, 18); // 4 + 6 + 8
});

test('a die converts to single-die dice', () => {
  const dice = Dice.from(Die.d20);
  assert.strictEqual(dice.minRoll, 1);
  assert.strictEqual(dice.maxRoll, 20);
  assert.strictEqual([...dice].length, 1);
});

// ---- getDistribution() correctness ----
//
// These pin the convolution logic against textbook reference distributions - the
// exact numbers a probability table for 2d6/3d6 would show in any RPG book.

test('getDistribution for a single die is uniform across all faces', () => {
  const distribution = new Dice(Die.d6).getDistribution();
  assert.strictEqual(distribution.size, 6);
  for (const probability of distribution.values()) {
    assertDecimalEqual(Decimal.ONE.divide(dec(6)), probability, 10);
  }
});

const twoD6KnownWays = [
  [2, 1], [3, 2], [4, 3], [5, 4], [6, 5], [7, 6], [8, 5], [9, 4], [10, 3], [11, 2], [12, 1],
];

for (const [sum, expectedWays] of twoD6KnownWays) {
  test(`getDistribution 2d6 sum ${sum} matches ${expectedWays}/36`, () => {
    const distribution = new Dice('2d6').getDistribution();
    assertDecimalEqual(dec(expectedWays).divide(dec(36)), distribution.get(sum), 10);
  });
}

const threeD6KnownWays = [
  [3, 1], [4, 3], [5, 6], [6, 10], [7, 15], [8, 21], [9, 25], [10, 27],
  [11, 27], [12, 25], [13, 21], [14, 15], [15, 10], [16, 6], [17, 3], [18, 1],
];

for (const [sum, expectedWays] of threeD6KnownWays) {
  test(`getDistribution 3d6 sum ${sum} matches ${expectedWays}/216`, () => {
    const distribution = new Dice('3d6').getDistribution();
    assertDecimalEqual(dec(expectedWays).divide(dec(216)), distribution.get(sum), 10);
  });
}

for (const dieString of ['d20', '2d6', '3d6', '8d20', '2d100']) {
  test(`getDistribution probabilities sum to one for ${dieString}`, () => {
    const distribution = new Dice(dieString).getDistribution();
    const total = [...distribution.values()].reduce((sum, p) => sum.add(p), Decimal.ZERO);
    assertDecimalEqual(Decimal.ONE, total, 10);
  });
}

for (const dieString of ['3d6', '3d12+2', 'd6+d8+1+2']) {
  // '3d12+2' is a regression case: the offset must include the flat modifier.
  test(`getDistribution keys span min to max with no gaps for ${dieString}`, () => {
    const dice = new Dice(dieString);
    const sortedKeys = [...dice.getDistribution().keys()].sort((a, b) => a - b);

    assert.strictEqual(sortedKeys[0], dice.minRoll);
    assert.strictEqual(sortedKeys[sortedKeys.length - 1], dice.maxRoll);
    for (let i = 1; i < sortedKeys.length; i++) {
      assert.strictEqual(sortedKeys[i], sortedKeys[i - 1] + 1);
    }
  });
}

test('getDistribution flat modifier shifts values without changing probabilities', () => {
  // A flat modifier should be a pure shift: "2d6+3" must have exactly the same
  // probabilities as 2d6, just relabeled 3 higher, not a different shape.
  const unshifted = new Dice('2d6').getDistribution();
  const shifted = new Dice('2d6+3').getDistribution();

  assert.strictEqual(shifted.size, unshifted.size);
  for (const [sum, probability] of unshifted) {
    assertDecimalEqual(probability, shifted.get(sum + 3), 10);
  }
});

test('getDistribution heterogeneous pool matches hand-computed shape', () => {
  // Known ways out of 16 for 2d4: 2:1, 3:2, 4:3, 5:4, 6:3, 7:2, 8:1.
  const distribution = new Dice(Die.d4, Die.d4).getDistribution();
  const expected = new Map([[2, 1], [3, 2], [4, 3], [5, 4], [6, 3], [7, 2], [8, 1]]);
  assert.strictEqual(distribution.size, expected.size);
  for (const [sum, ways] of expected) {
    assertDecimalEqual(dec(ways).divide(dec(16)), distribution.get(sum), 10);
  }
});

// ---- Formatting ----

test('toString of a single die is just the die name', () => {
  assert.strictEqual(new Dice(Die.d20).toString(), 'd20');
});

test('toString of multiple identical dice uses a count prefix', () => {
  assert.strictEqual(new Dice('3d6').toString(), '3d6');
});
