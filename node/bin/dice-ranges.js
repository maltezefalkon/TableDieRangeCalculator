#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');

const { Dice } = require('../src/dice');
const { DiceTable } = require('../src/diceTable');
const { ArgumentError } = require('../src/errors');
const { parse } = require('../src/jsonReader');
const { bindInputTable } = require('../src/inputTable');

function run(args, stdout) {
  try {
    const text = args.length === 1 ? fs.readFileSync(args[0], 'utf8') : fs.readFileSync(0, 'utf8');
    const inputTable = bindInputTable(parse(text));

    // Case-insensitive matching means a field simply being absent from the input
    // still leaves it null - fail clearly here rather than letting that null flow
    // into unrelated code (e.g. a regex match) and surface as a confusing error
    // from somewhere that gives no hint the actual problem was a missing field.
    if (inputTable.dice === null || inputTable.dice.trim() === '') {
      throw new ArgumentError('Input JSON is missing a required \'dice\' field (e.g. "3d6", "d%").');
    }
    if (inputTable.entries === null || inputTable.entries.length === 0) {
      throw new ArgumentError("Input JSON is missing a required, non-empty 'entries' array.");
    }

    const dice = new Dice(inputTable.dice);
    const outputTable = new DiceTable(inputTable.entries, (t) => t.weight, dice);
    stdout(outputTable.toJson(inputTable.name) + os.EOL);
  } catch (error) {
    stdout(error.message + os.EOL);
    return -1;
  }
  return 0;
}

if (require.main === module) {
  process.exitCode = run(process.argv.slice(2), (text) => process.stdout.write(text));
}

module.exports = { run };
