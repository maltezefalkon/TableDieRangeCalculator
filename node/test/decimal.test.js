'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { Decimal } = require('../src/decimal');
const { escapeString } = require('../src/netJson');

// These pin the System.Decimal and System.Text.Json behaviours the port has to
// reproduce byte-for-byte. Every expected value here was read off the .NET tool's
// own output, not derived from first principles.

const dec = (text) => Decimal.parse(text);

test('division fills all 28 decimal places for a repeating quotient', () => {
  assert.strictEqual(Decimal.ONE.divide(dec('3')).toString(), '0.3333333333333333333333333333');
  assert.strictEqual(Decimal.ONE.divide(dec('6')).toString(), '0.1666666666666666666666666667');
  assert.strictEqual(dec('10').divide(dec('18')).toString(), '0.5555555555555555555555555556');
});

test('division trims trailing zeros so exact quotients print in shortest form', () => {
  assert.strictEqual(Decimal.ONE.divide(dec('4')).toString(), '0.25');
  assert.strictEqual(dec('27').divide(dec('216')).toString(), '0.125');
  assert.strictEqual(dec('25').divide(dec('100')).toString(), '0.25');
});

test('division keeps 29 significant digits when the integer part allows it', () => {
  assert.strictEqual(dec('100').divide(dec('3')).toString(), '33.333333333333333333333333333');
});

test('addition preserves the wider scale rather than trimming', () => {
  // 3 * (1/6) lands one ulp above 0.5 precisely because each 1/6 was rounded up
  // at the 28th place first - this is the accumulation the .NET output shows.
  const sixth = Decimal.ONE.divide(dec('6'));
  assert.strictEqual(sixth.add(sixth).add(sixth).toString(), '0.5000000000000000000000000001');
  assert.strictEqual(dec('0.10').add(dec('0.10')).toString(), '0.20');
});

test('summing individually rounded quotients reproduces the 3d6 assigned weight', () => {
  // 8..12 on 3d6 is 21+25+27+27+25 ways out of 216. Summing the rounded per-value
  // probabilities gives ...037036, not the ...037037 an exact 125/216 would.
  const total = dec('216');
  const sum = [21, 25, 27, 27, 25]
    .map((ways) => dec(String(ways)).divide(total))
    .reduce((acc, p) => acc.add(p), Decimal.ZERO);
  assert.strictEqual(sum.toString(), '0.5787037037037037037037037036');
});

test('parsing preserves a literal trailing zero', () => {
  // System.Text.Json binds "1.50" to a scale-2 decimal and prints it back as "1.50".
  assert.strictEqual(dec('1.50').toString(), '1.50');
  assert.strictEqual(dec('-1.50').toString(), '-1.50');
});

test('the double cast rounds to 15 significant digits', () => {
  assert.strictEqual(Decimal.fromDouble(1 / 3).toString(), '0.333333333333333');
  assert.strictEqual(Decimal.fromDouble(0.1).toString(), '0.100000000000000');
  assert.strictEqual(Decimal.fromDouble(0).toString(), '0');
});

test('comparison ignores scale', () => {
  assert.ok(dec('0.5').equals(dec('0.50')));
  assert.ok(dec('0.1').lessThan(dec('0.2')));
  assert.strictEqual(dec('2.0').compareTo(dec('2')), 0);
});

test('rounding uses banker\'s rounding, matching Math.Round(decimal, int)', () => {
  assert.strictEqual(dec('0.125').round(2).toString(), '0.12');
  assert.strictEqual(dec('0.135').round(2).toString(), '0.14');
  assert.strictEqual(dec('0.145').round(2).toString(), '0.14');
});

test('string escaping matches the default JavaScriptEncoder', () => {
  // Quote, ampersand, apostrophe, plus, angle brackets and backtick are escaped
  // as uppercase \uXXXX rather than left literal or given short escapes.
  assert.strictEqual(escapeString('"&\'+<>`'), '"\\u0022\\u0026\\u0027\\u002B\\u003C\\u003E\\u0060"');
  assert.strictEqual(escapeString('a/b\\c'), '"a/b\\\\c"');
  assert.strictEqual(escapeString('\b\t\n\f\r'), '"\\b\\t\\n\\f\\r"');
  assert.strictEqual(escapeString('\u000b\u007f'), '"\\u000B\\u007F"');
  assert.strictEqual(escapeString('Café 🎲'), '"Caf\\u00E9 \\uD83C\\uDFB2"');
  assert.strictEqual(escapeString('Sun / Law'), '"Sun / Law"');
});
