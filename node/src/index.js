'use strict';

const { Decimal } = require('./decimal');
const { Die } = require('./die');
const { Dice } = require('./dice');
const { DiceRange, PercentileDiceRange } = require('./diceRange');
const { DiceTable } = require('./diceTable');
const { permute } = require('./permute');
const { ArgumentError } = require('./errors');
const { InputTableEntry, bindInputTable } = require('./inputTable');

function makeTable(entries, dice, weightFunction, equals) {
  return new DiceTable(entries, weightFunction, dice, equals);
}

module.exports = {
  Decimal,
  Die,
  Dice,
  DiceRange,
  PercentileDiceRange,
  DiceTable,
  ArgumentError,
  InputTableEntry,
  bindInputTable,
  permute,
  makeTable,
};
