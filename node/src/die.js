'use strict';

const { Decimal } = require('./decimal');

const registry = new Map();

class Die {
  constructor(sides) {
    this.minRoll = 1;
    this.maxRoll = sides;
    this.name = `d${sides}`;
  }

  static register(minRoll, maxRoll, name) {
    const die = Object.create(Die.prototype);
    die.minRoll = minRoll;
    die.maxRoll = maxRoll;
    die.name = name;
    registry.set(name, die);
    return die;
  }

  static getDie(name) {
    if (name.toLowerCase() === 'd%') return Die.d100;
    const die = registry.get(name);
    if (die === undefined) {
      throw new Error(`The given key '${name}' was not present in the dictionary.`);
    }
    return die;
  }

  get sides() {
    return this.maxRoll - this.minRoll + 1;
  }

  get faceProbability() {
    return Decimal.ONE.divide(Decimal.fromInt(this.sides));
  }

  getHeader() {
    return Die.getHeaderFor(this.minRoll, this.maxRoll);
  }

  static getHeaderFor(minRoll, maxRoll) {
    const matches = [...registry.values()].filter((d) => d.minRoll === minRoll && d.maxRoll === maxRoll);
    if (matches.length === 1) return `${matches[0].name} Roll`;
    if (minRoll === 1) return `d${maxRoll} Roll`;
    return 'Roll';
  }
}

Die.d2 = Die.register(1, 2, 'd2');
Die.d3 = Die.register(1, 3, 'd3');
Die.d4 = Die.register(1, 4, 'd4');
Die.d6 = Die.register(1, 6, 'd6');
Die.d8 = Die.register(1, 8, 'd8');
Die.d10 = Die.register(1, 10, 'd10');
Die.d12 = Die.register(1, 12, 'd12');
Die.d16 = Die.register(1, 16, 'd16');
Die.d20 = Die.register(1, 20, 'd20');
Die.d24 = Die.register(1, 24, 'd24');
Die.d30 = Die.register(1, 30, 'd30');
Die.d100 = Die.register(1, 100, 'd100');
Die.d1000 = Die.register(1, 1000, 'd1000');

module.exports = { Die };
