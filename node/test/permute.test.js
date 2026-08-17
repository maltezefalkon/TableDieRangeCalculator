'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { permute } = require('../src/permute');

test('permute produces every ordering of [1,2,3]', () => {
  const sequence = [1, 2, 3];
  const expected = [[1, 2, 3], [2, 1, 3], [3, 2, 1], [2, 3, 1], [1, 3, 2], [3, 1, 2]];
  const result = permute(sequence);

  assert.strictEqual(result.length, expected.length);
  for (const expectedPermutation of expected) {
    assert.ok(
      result.some((actual) => actual.length === expectedPermutation.length && actual.every((v, i) => v === expectedPermutation[i])),
      `missing permutation ${expectedPermutation.join(',')}`
    );
  }
});

test('permute of a single item yields that item', () => {
  const result = permute([1]);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0][0], 1);
});

// Not in the C# suite, but the emission ORDER is load-bearing: brute-force
// ordering keeps the first candidate with a strictly better deviation, so a
// reordering here would silently change which of two tied tables wins.
test('permute emission order matches the C# implementation', () => {
  assert.deepStrictEqual(permute([1, 2, 3]), [
    [3, 2, 1], [2, 3, 1], [3, 1, 2], [1, 3, 2], [2, 1, 3], [1, 2, 3],
  ]);
});
