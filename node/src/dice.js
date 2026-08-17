'use strict';

const { Decimal } = require('./decimal');
const { Die } = require('./die');
const { DiceRange, PercentileDiceRange } = require('./diceRange');

const DICE_TERM = /(?<quantity>\d+)?d(?<sides>\d+|%)/i;
const INT32_MIN = -2147483648;
const INT32_MAX = 2147483647;

function tryParseInt(text) {
  if (!/^[+-]?\d+$/.test(text)) return null;
  const value = Number(text);
  if (!Number.isInteger(value) || value < INT32_MIN || value > INT32_MAX) return null;
  return value;
}

class Dice {
  // Accepts either a dice expression ("3d6", "d%", "d6+d8+1") or any number of
  // Die / Dice values to pool together.
  constructor(...args) {
    if (args.length === 1 && typeof args[0] === 'string') {
      this._initFromString(args[0]);
    } else if (args.every((a) => a instanceof Dice)) {
      this._dice = args.flatMap((d) => d._dice);
      this.modifier = args.reduce((sum, d) => sum + d.modifier, 0);
      this.minRoll = this._dice.reduce((sum, d) => sum + d.minRoll, 0) + this.modifier;
      this.maxRoll = this._dice.reduce((sum, d) => sum + d.maxRoll, 0) + this.modifier;
    } else {
      this._dice = args;
      this.modifier = 0;
      this.minRoll = this._dice.reduce((sum, d) => sum + d.minRoll, 0);
      this.maxRoll = this._dice.reduce((sum, d) => sum + d.maxRoll, 0);
    }
  }

  // Mirrors the implicit Die -> Dice conversion the C# API relies on.
  static from(value) {
    return value instanceof Dice ? value : new Dice(value);
  }

  _initFromString(dieString) {
    const dice = [];
    let modifier = 0;
    for (const term of dieString.split('+')) {
      const clean = term.replace(/ /g, '');
      const match = DICE_TERM.exec(clean);

      // Regex matching finds the pattern anywhere in the string, so "3d6-2" would
      // otherwise match just "3d6" and silently drop the "-2" - a confidently wrong
      // die pool with no signal anything was ignored. Require the match to consume
      // the whole term before accepting it as a dice group.
      const isWholeTermDiceGroup = match !== null && match.index === 0 && match[0].length === clean.length;

      if (!isWholeTermDiceGroup) {
        const mod = tryParseInt(clean);
        if (mod === null) throw new Error(`Failed to parse die string term: '${term}'`);
        modifier += mod;
      } else {
        const quantity = match.groups.quantity !== undefined ? parseInt(match.groups.quantity, 10) : 1;
        for (let i = 0; i < quantity; i++) {
          dice.push(Die.getDie(`d${match.groups.sides}`));
        }
      }
    }
    this._dice = dice;
    this.modifier = modifier;
    this.minRoll = dice.reduce((sum, d) => sum + d.minRoll, 0) + modifier;
    this.maxRoll = dice.reduce((sum, d) => sum + d.maxRoll, 0) + modifier;
  }

  get length() {
    return this._dice.length;
  }

  [Symbol.iterator]() {
    return this._dice[Symbol.iterator]();
  }

  range(entry) {
    return this.isPercentile() ? new PercentileDiceRange(entry) : new DiceRange(entry);
  }

  isPercentile() {
    return this.minRoll === 1 && this.maxRoll === 100 && this._dice.length === 1 && this.modifier === 0;
  }

  getDistribution() {
    // The offset starts at the flat modifier, not 0 - every key returned here must
    // land in [minRoll, maxRoll], which already include the modifier, or callers
    // indexing by minRoll/maxRoll look up keys that don't exist.
    let offset = this.modifier;
    let dist = [1n]; // rolling zero dice sums to 0 in exactly one way

    for (const die of this._dice) {
      // prefix sums of the current distribution, so each new cell is an O(1) window lookup
      const prefix = new Array(dist.length + 1);
      prefix[0] = 0n;
      for (let i = 0; i < dist.length; i++) prefix[i + 1] = prefix[i] + dist[i];

      const sides = die.sides;
      const newLength = dist.length + sides - 1;
      const next = new Array(newLength);
      for (let i = 0; i < newLength; i++) {
        const hi = Math.min(i, dist.length - 1);
        const lo = Math.max(i - sides + 1, 0);
        next[i] = hi >= lo ? prefix[hi + 1] - prefix[lo] : 0n;
      }

      dist = next;
      offset += die.minRoll;
    }

    const total = Decimal.fromInt(dist.reduce((sum, v) => sum + v, 0n));
    const result = new Map();
    for (let i = 0; i < dist.length; i++) {
      result.set(offset + i, Decimal.fromInt(dist[i]).divide(total));
    }
    return result;
  }

  getHeader() {
    return this.toString();
  }

  toString() {
    const inner = this._innerToString();
    return this.modifier !== 0 ? `${inner} + ${this.modifier}` : inner;
  }

  _innerToString() {
    const names = [...new Set(this._dice.map((d) => d.name))];
    if (names.length !== 1) {
      return names
        .map((name) => {
          const count = this._dice.filter((d) => d.name === name).length;
          return count === 1 ? name : `${count}${name}`;
        })
        .join('+');
    }
    if (this._dice.length === 1) return names[0];
    return `${this._dice.length}${names[0]}`;
  }
}

module.exports = { Dice };
