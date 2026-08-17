'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

// Runs the same requests through the published .NET build and this port and
// requires byte-identical stdout. This is the real definition of "ported
// correctly" - the unit tests can both be satisfied by two implementations that
// still disagree on rounding, ordering, or escaping.

const DLL = path.join(__dirname, '..', '..', 'publish', 'TableDieRangeCalculator.dll');
const CLI = path.join(__dirname, '..', 'bin', 'dice-ranges.js');

function hasDotnet() {
  if (!fs.existsSync(DLL)) return false;
  try {
    execFileSync('dotnet', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function capture(command, args, input) {
  try {
    return execFileSync(command, args, { input, encoding: 'utf8' });
  } catch (error) {
    return (error.stdout ?? '') + (error.stderr ?? '');
  }
}

const DICE = [
  'd4', 'd6', 'd8', 'd12', 'd20', 'd30', 'd100', 'd%',
  '2d6', '3d6', '2d8', '3d10', '2d20', '8d20', '2d100',
  '3d12+2', 'd100+5', 'd100+0', 'd6+d8+1', '8d20+10', 'd4+d6+d8', '10d4', '3D6',
];

// Deliberately skips 7- and 8-entry sets. A multi-die pool with 7 or 8 entries
// takes the brute-force path, which solves the full DP once per m! orderings -
// on a 150-outcome pool like 8d20 that is 6 minutes at 7 entries and tens of
// minutes at 8, in either implementation. The brute-force path is still covered,
// on small pools where it stays quick, by BRUTE_FORCE_CASES below.
const WEIGHTS = [
  [1],
  [1, 1],
  [7, 5, 2],
  [70, 20, 10],
  [1, 2, 3, 4, 5],
  [4, 4, 2, 2, 1, 1],
  [0.5, 0.25, 0.25],
  [1.23456789012345678, 2, 3],
  [1, 2, 4, 8, 16, 32, 64, 128, 256],
  Array.from({ length: 30 }, (_, i) => [7, 5, 2][i % 3]),
];

// The expensive-but-tractable corner: exactly MAX_BRUTE_FORCE_ENTRIES (8) entries
// on a multi-die pool small enough that 40,320 full DP solves still finish in
// seconds. This count must stay at the threshold - above it these fall through to
// the zig-zag heuristic and stop covering the brute-force path they exist to test.
const BRUTE_FORCE_CASES = ['2d6', '3d6', '2d8', 'd4+d6+d8'].map((dice) =>
  JSON.stringify({
    name: `brute force ${dice}`,
    dice,
    entries: [9, 3, 6, 5, 5, 5, 11, 2].map((weight, i) => ({ entry: `Entry ${i}`, weight })),
  })
);

// Malformed, edge-case and error-path requests, where matching the exact message
// text and exit behaviour matters as much as matching a successful table.
const EDGE_CASES = [
  '{"dice":"","entries":[]}',
  '{"dice":"banana","entries":[{"entry":"A","weight":1}]}',
  '{"dice":"d0","entries":[{"entry":"A","weight":1}]}',
  '{"dice":"3d6-2","entries":[{"entry":"A","weight":1}]}',
  '{"dice":"d20-5","entries":[{"entry":"A","weight":1}]}',
  '{"dice":"d4","entries":[{"entry":"A","weight":1},{"entry":"B","weight":1},{"entry":"C","weight":1},{"entry":"D","weight":1},{"entry":"E","weight":1}]}',
  '{"dice":"d6","entries":[{"entry":"A","weight":1},{"entry":"A","weight":1}]}',
  '{"dice":"d6"}',
  '{"entries":[{"entry":"A","weight":1}]}',
  '{"Dice":"d6","Entries":[{"Entry":"A","Weight":1},{"Entry":"B","Weight":2}]}',
  '{"dice":"d6","entries":[{"entry":"A"},{"entry":"B","weight":2}]}',
  '{"dice":"d6","entries":[{"entry":"A","weight":1.50},{"entry":"B","weight":-1.50}]}',
  '{"dice":"d6","entries":[{"entry":"Caf\\u00e9 & <b>+ / \\u2014 \\u201cq\\u201d \\ud83c\\udfb2","weight":1},{"entry":"B","weight":1}]}',
  '{"dice":"d6","entries":[{"entry":"tab\\there","weight":1},{"entry":"B","weight":1}]}',
  '{"name":null,"dice":"d6","entries":[{"entry":"A","weight":1},{"entry":"B","weight":1}]}',
  '{"name":"Wandering Monsters","dice":"3d6","entries":[{"entry":"Goblin patrol","weight":5},{"entry":"Wild boar","weight":3},{"entry":"Nothing","weight":10}]}',
];

test('node CLI output is byte-identical to the .NET build', { skip: hasDotnet() ? false : 'published .NET build or dotnet not available' }, () => {
  const requests = [];
  for (const dice of DICE) {
    for (const weights of WEIGHTS) {
      requests.push(
        JSON.stringify({
          name: `${dice} x${weights.length}`,
          dice,
          entries: weights.map((weight, i) => ({ entry: `Entry ${i}`, weight })),
        })
      );
    }
  }
  requests.push(...BRUTE_FORCE_CASES, ...EDGE_CASES);

  const mismatches = [];
  for (const request of requests) {
    const expected = capture('dotnet', [DLL], request);
    const actual = capture(process.execPath, [CLI], request);
    if (expected !== actual) {
      mismatches.push({ request, expected, actual });
    }
  }

  assert.deepStrictEqual(mismatches, [], `${mismatches.length} of ${requests.length} requests diverged`);
});
