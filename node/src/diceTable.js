'use strict';

const { Decimal } = require('./decimal');
const { Dice } = require('./dice');
const { permute } = require('./permute');
const { ArgumentError } = require('./errors');
const { serialize, rawNumber } = require('./netJson');

// Trying every ordering is m! work. 8! = 40,320 (instant), 10! = 3,628,800
// (a couple seconds) - beyond that it grows too fast to be worth the wait, so
// larger entry sets fall back to the zig-zag heuristic ordering instead.
const MAX_BRUTE_FORCE_ENTRIES = 8;

function defaultEquals(a, b) {
  if (a === b) return true;
  if (a !== null && a !== undefined && typeof a.equals === 'function') return a.equals(b);
  return false;
}

class DiceTable {
  constructor(entries, weightingFunction, dice, equals = defaultEquals) {
    this.dice = Dice.from(dice);
    this._equals = equals;
    this._pairs = [];

    let list = Array.from(entries, (entry) => {
      const range = this.dice.range(entry);
      range.targetWeight = weightingFunction(entry);
      return range;
    });
    normalizeWeights(list);

    let splits;
    if (this.dice.length === 1) {
      ({ split: splits } = dynamicProgrammingOptimal(this.dice, list));
    }
    // If there's a bell curve involved, then we might need to reorder the list of
    // entries in order to achieve the desired weights.
    else if (list.length <= MAX_BRUTE_FORCE_ENTRIES) {
      // Small enough to try every ordering and keep the provably best one.
      ({ ordering: list, split: splits } = bruteForceAllOrderings(this.dice, list));
    } else {
      // Too many entries for m! orderings to be feasible - the zig-zag heuristic
      // (small weights at both ends, large weights in the middle) tends to land
      // close to optimal for a symmetric, unimodal distribution.
      list = zigZagSort(list);
      ({ split: splits } = dynamicProgrammingOptimal(this.dice, list));
    }

    backtrack(this.dice, list, splits);
    for (const range of list) this._add(range.entry, range);
  }

  _add(entry, range) {
    if (this._pairs.some(([key]) => this._equals(key, entry))) {
      throw new ArgumentError(`An item with the same key has already been added. Key: ${entry}`);
    }
    this._pairs.push([entry, range]);
  }

  get count() {
    return this._pairs.length;
  }

  get keys() {
    return this._pairs.map(([key]) => key);
  }

  get values() {
    return this._pairs.map(([, value]) => value);
  }

  get(entry) {
    const found = this._pairs.find(([key]) => this._equals(key, entry));
    return found === undefined ? undefined : found[1];
  }

  has(entry) {
    return this._pairs.some(([key]) => this._equals(key, entry));
  }

  elementAt(index) {
    const [key, value] = this._pairs[index];
    return { key, value };
  }

  [Symbol.iterator]() {
    return this._pairs.map(([key, value]) => ({ key, value }))[Symbol.iterator]();
  }

  toJson(name = null) {
    return serialize({
      Name: name === undefined ? null : name,
      Dice: this.dice.toString(),
      Min: rawNumber(this.dice.minRoll),
      Max: rawNumber(this.dice.maxRoll),
      Ranges: this._pairs.map(([key, value]) => ({
        Entry: (key === null || key === undefined ? null : key.toString()) ?? '',
        Min: rawNumber(value.minRoll),
        Max: rawNumber(value.maxRoll),
        Range: value.writeRange(),
        TargetWeight: rawNumber(value.targetWeight),
        AssignedWeight: rawNumber(value.assignedWeight),
      })),
    });
  }
}

// Tries every possible ordering of `list` and keeps whichever one produces the
// lowest total deviation once dynamicProgrammingOptimal finds its best split -
// i.e. the provably best fixed-order table achievable for these entries. Only
// tractable while list.length! is small (see MAX_BRUTE_FORCE_ENTRIES).
function bruteForceAllOrderings(dice, list) {
  let bestOrdering = list;
  let bestSplit = null;
  let bestDeviation = Decimal.MAX_VALUE;

  for (const candidateOrdering of permute(list)) {
    const { split, totalDeviation } = dynamicProgrammingOptimal(dice, candidateOrdering);
    if (totalDeviation.lessThan(bestDeviation)) {
      bestDeviation = totalDeviation;
      bestOrdering = candidateOrdering;
      bestSplit = split;
    }
  }

  return { ordering: bestOrdering, split: bestSplit };
}

function zigZagSort(list) {
  let front = true;
  const array = [...list].sort((a, b) => a.targetWeight.compareTo(b.targetWeight));
  const target = new Array(array.length);
  for (let i = 0; i < array.length; i++) {
    if (front) {
      target[Math.floor(i / 2)] = array[i];
      front = false;
    } else {
      target[array.length - Math.floor((i + 1) / 2)] = array[i];
      front = true;
    }
  }
  return target;
}

function dynamicProgrammingOptimal(dice, list) {
  const distribution = dice.getDistribution();
  const outcomeCount = distribution.size;
  if (list.length > outcomeCount) {
    // Can't give every entry its own contiguous, non-empty range if there are more
    // entries than there are possible results to divide up.
    throw new ArgumentError(
      `${dice} only has ${outcomeCount} possible results and cannot be used for a set of ${list.length} entries.`
    );
  }

  const prefixSums = computePrefixSums(dice);
  const dp = new Map();
  const split = new Map();

  // Base case: zero outcomes used for zero entries costs nothing. Every other
  // state stays absent ("unreachable so far"), but this one must be seeded to 0
  // up front, or the very first lookup of it treats it as unreachable instead of free.
  dp.set(0, new Map([[0, Decimal.ZERO]]));

  // The candidate range's weight depends only on (i, k), and each entry's target
  // weight only on j, so both are lifted out of the innermost loop. Same values,
  // just computed once each instead of once per (i, j, k).
  const targetWeights = list.map((range) => range.targetWeight.toNumber());

  for (let i = 1; i <= outcomeCount; i++) {
    const highPrefix = prefixSums.get(i + dice.minRoll - 1);
    const assignedWeights = new Array(i);

    for (let j = 1; j <= Math.min(i, list.length); j++) {
      for (let k = j - 1; k <= i - 1; k++) {
        const previous = dp.has(k) ? dp.get(k).get(j - 1) : undefined;
        if (previous === undefined) continue;

        if (assignedWeights[k] === undefined) {
          assignedWeights[k] = highPrefix
            .subtract(k > 0 ? prefixSums.get(k + dice.minRoll - 1) : Decimal.ZERO)
            .toNumber();
        }
        const difference = assignedWeights[k] - targetWeights[j - 1];
        const cost = previous.add(Decimal.fromDouble(difference * difference));

        if (!dp.has(i)) {
          dp.set(i, new Map());
          split.set(i, new Map());
        }
        if (!dp.get(i).has(j) || cost.lessThan(dp.get(i).get(j))) {
          dp.get(i).set(j, cost);
          split.get(i).set(j, k);
        }
      }
    }
  }

  // dp[n][m]: the best achievable total deviation using ALL outcomes for ALL
  // entries - the answer to the whole problem, and what callers compare across
  // candidate orderings.
  const totalDeviation = dp.get(outcomeCount)?.get(list.length);
  if (totalDeviation === undefined) throw new Error('Unexpected error calculating deviation');
  return { split, totalDeviation };
}

// Recovers each entry's final die-value range from the optimal-split table.
//
// dynamicProgrammingOptimal only worked out the SCORE of the best arrangement at
// every (outcomes-used, entries-placed) checkpoint - split[i][j] is the memory of
// *where* the boundary was that achieved that score: entries 1..j-1 optimally cover
// sorted-outcome positions 1..k, and entry j covers positions k+1..i.
//
// To reconstruct actual ranges, start from the answer to the WHOLE problem -
// split[n][m], which tells you where the LAST entry's range begins - then walk
// backward: once you know entry m's boundary, everything before it is exactly the
// (m-1)-entry version of the same problem, restricted to fewer outcomes.
function backtrack(dice, list, split) {
  const distribution = dice.getDistribution();

  // The die's possible sums in ascending order, e.g. for 3d6: [3, 4, ..., 18].
  // Array index p is sorted-outcome position (p + 1), the convention split was built against.
  const sortedRollValues = [...distribution.keys()].sort((a, b) => a - b);

  let outcomesRemaining = sortedRollValues.length;

  // Walk entries from LAST to FIRST, shrinking the unresolved region each step.
  for (let entryPosition = list.length; entryPosition >= 1; entryPosition--) {
    // Everything up to (and including) sorted-outcome position "boundaryIndex"
    // belongs to the entries BEFORE this one. Everything after that boundary,
    // through outcomesRemaining, is this entry's range.
    const boundaryIndex = split.get(outcomesRemaining).get(entryPosition);

    const entry = list[entryPosition - 1];
    entry.minRoll = sortedRollValues[boundaryIndex];
    entry.maxRoll = sortedRollValues[outcomesRemaining - 1];

    // Now that the entry's final range is known, its real assigned probability is
    // just the distribution mass covered by that range.
    let assignedWeight = Decimal.ZERO;
    for (let rollValue = entry.minRoll; rollValue <= entry.maxRoll; rollValue++) {
      assignedWeight = assignedWeight.add(distribution.get(rollValue));
    }
    entry.assignedWeight = assignedWeight;

    outcomesRemaining = boundaryIndex;
  }

  // Every outcome from the low end through the high end should now be claimed by
  // exactly one entry, with no gaps or overlaps, purely from the DP's structure.
  if (outcomesRemaining !== 0) {
    throw new Error('Backtracking did not consume every outcome - split table is inconsistent.');
  }
}

function normalizeWeights(ranges) {
  const totalWeight = ranges.reduce((sum, r) => sum.add(r.targetWeight), Decimal.ZERO);
  if (totalWeight.greaterThan(Decimal.ZERO)) {
    for (const range of ranges) {
      range.targetWeight = range.targetWeight.divide(totalWeight);
    }
  }
}

function computePrefixSums(dice) {
  const rollProbabilities = dice.getDistribution();
  const prefixSums = new Map();
  let first = true;
  for (const key of [...rollProbabilities.keys()].sort((a, b) => a - b)) {
    if (first) {
      prefixSums.set(key, rollProbabilities.get(key));
      first = false;
    } else {
      prefixSums.set(key, prefixSums.get(key - 1).add(rollProbabilities.get(key)));
    }
  }
  return prefixSums;
}

module.exports = { DiceTable, MAX_BRUTE_FORCE_ENTRIES };
