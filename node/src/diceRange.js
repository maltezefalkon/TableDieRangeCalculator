'use strict';

const { Decimal } = require('./decimal');

class DiceRange {
  constructor(entry) {
    this.entry = entry;
    this.minRoll = 0;
    this.maxRoll = 0;
    this.assignedWeight = Decimal.ZERO;
    this.targetWeight = Decimal.ZERO;
  }

  writeRange() {
    if (this.minRoll === 0 && this.maxRoll === 0) return DiceRange.Nil;
    if (this.minRoll === this.maxRoll) return String(this.minRoll);
    return `${this.minRoll}-${this.maxRoll}`;
  }
}

DiceRange.Nil = '-';

function pad2(value) {
  return String(value).padStart(2, '0');
}

class PercentileDiceRange extends DiceRange {
  writeRange() {
    if (this.minRoll === 0 && this.maxRoll === 0) return super.writeRange();
    if (this.minRoll === this.maxRoll) {
      return this.minRoll === 100 ? PercentileDiceRange.DoubleZero : pad2(this.minRoll);
    }
    if (this.maxRoll === 100) return `${pad2(this.minRoll)}-${PercentileDiceRange.DoubleZero}`;
    return `${pad2(this.minRoll)}-${pad2(this.maxRoll)}`;
  }
}

PercentileDiceRange.DoubleZero = '00';

module.exports = { DiceRange, PercentileDiceRange };
