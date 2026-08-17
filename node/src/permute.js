'use strict';

// Emission order matters: BruteForceAllOrderings keeps the first ordering with a
// strictly better deviation, so two orderings that tie are resolved by whichever
// this yields first. For [1,2,3] that order is
// [3,2,1], [2,3,1], [3,1,2], [1,3,2], [2,1,3], [1,2,3].
function permute(sequence) {
  const items = Array.from(sequence);
  if (items.length <= 1) return [items];

  const result = [];
  for (const item of items) {
    const remaining = items.filter((x) => !Object.is(x, item));
    for (const permuted of permute(remaining)) {
      result.push([...permuted, item]);
    }
  }
  return result;
}

module.exports = { permute };
