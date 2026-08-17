'use strict';

// A faithful stand-in for System.Decimal: value = (-1)^neg * m / 10^s, with m a
// 96-bit unsigned integer and s in [0, 28].
//
// This is not a convenience wrapper around JS numbers. The .NET calculator's
// observable output depends on decimal semantics in two places that doubles
// cannot reproduce: the weight strings it prints carry all 28 digits (and the
// exact accumulated rounding of summing individually-rounded quotients), and
// the dynamic-programming search compares costs for strict improvement, so ties
// that are exact in decimal must stay exact here or a different split wins.

const MAX_SCALE = 28;
const MAX_MANTISSA = (1n << 96n) - 1n;

const POW10 = [];
for (let i = 0; i <= 64; i++) POW10.push(10n ** BigInt(i));

function pow10(n) {
  return n < POW10.length ? POW10[n] : 10n ** BigInt(n);
}

// Round half away from zero, matching how .NET drops excess digits.
function divRound(n, d) {
  const q = n / d;
  const r = n % d;
  return r * 2n >= d ? q + 1n : q;
}

class OverflowError extends Error {
  constructor() {
    super('Value was either too large or too small for a Decimal.');
    this.name = 'OverflowError';
  }
}

class DivideByZeroError extends Error {
  constructor() {
    super('Attempted to divide by zero.');
    this.name = 'DivideByZeroError';
  }
}

class Decimal {
  constructor(neg, m, s) {
    this.neg = neg && m !== 0n;
    this.m = m;
    this.s = s;
    Object.freeze(this);
  }

  static fromInt(value) {
    const v = BigInt(value);
    const neg = v < 0n;
    const m = neg ? -v : v;
    if (m > MAX_MANTISSA) throw new OverflowError();
    return new Decimal(neg, m, 0);
  }

  // Emulates the (decimal)someDouble cast, which rounds to 15 significant digits.
  static fromDouble(value) {
    if (!Number.isFinite(value)) throw new OverflowError();
    if (value === 0) return Decimal.ZERO;
    const neg = value < 0;
    return Decimal.parse(Math.abs(value).toPrecision(15)).withSign(neg);
  }

  static parse(text) {
    const match = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(text.trim());
    if (!match || (match[2] === '' && !match[3])) {
      throw new Error(`The input string '${text}' was not in a correct format.`);
    }
    const neg = match[1] === '-';
    const intPart = match[2] || '';
    const fracPart = match[3] || '';
    const exponent = match[4] ? parseInt(match[4], 10) : 0;

    let m = BigInt((intPart + fracPart) || '0');
    let s = fracPart.length - exponent;
    if (s < 0) {
      m *= pow10(-s);
      s = 0;
    }
    // No trailing-zero trim: System.Text.Json binds "1.50" to a decimal that
    // still reports scale 2, and prints it back as "1.50".
    return fit(neg, m, s);
  }

  get isZero() {
    return this.m === 0n;
  }

  signedMantissa() {
    return this.neg ? -this.m : this.m;
  }

  withSign(neg) {
    return new Decimal(neg, this.m, this.s);
  }

  negate() {
    return new Decimal(!this.neg, this.m, this.s);
  }

  // Addition keeps the wider operand's scale rather than trimming, which is what
  // makes a sum of 28-scale quotients report all 28 digits.
  add(other) {
    const s = Math.max(this.s, other.s);
    const sum =
      this.signedMantissa() * pow10(s - this.s) +
      other.signedMantissa() * pow10(s - other.s);
    return fit(sum < 0n, sum < 0n ? -sum : sum, s);
  }

  subtract(other) {
    return this.add(other.negate());
  }

  multiply(other) {
    const product = this.signedMantissa() * other.signedMantissa();
    return fit(product < 0n, product < 0n ? -product : product, this.s + other.s);
  }

  // Division carries as many digits as will fit and then drops trailing zeros,
  // so exact quotients come out in their shortest form (1/4 is "0.25", not
  // "0.2500000000000000000000000000") while 1/3 fills all 28 places.
  divide(other) {
    if (other.isZero) throw new DivideByZeroError();
    if (this.isZero) return Decimal.ZERO;

    const neg = this.neg !== other.neg;
    const numerator = this.m * pow10(other.s);
    const denominator = other.m * pow10(this.s);

    let s = MAX_SCALE;
    let m = divRound(numerator * pow10(s), denominator);
    while (m > MAX_MANTISSA && s > 0) {
      s -= 1;
      m = divRound(numerator * pow10(s), denominator);
    }
    if (m > MAX_MANTISSA) throw new OverflowError();

    return new Decimal(neg, m, s).trimTrailingZeros();
  }

  trimTrailingZeros() {
    if (this.s === 0) return this;
    if (this.m === 0n) return new Decimal(this.neg, 0n, 0);
    const digits = this.m.toString();
    let zeros = 0;
    while (zeros < this.s && digits.charCodeAt(digits.length - 1 - zeros) === 48) zeros++;
    if (zeros === 0) return this;
    return new Decimal(this.neg, this.m / pow10(zeros), this.s - zeros);
  }

  compareTo(other) {
    const s = Math.max(this.s, other.s);
    const a = this.signedMantissa() * pow10(s - this.s);
    const b = other.signedMantissa() * pow10(s - other.s);
    return a < b ? -1 : a > b ? 1 : 0;
  }

  lessThan(other) {
    return this.compareTo(other) < 0;
  }

  greaterThan(other) {
    return this.compareTo(other) > 0;
  }

  equals(other) {
    return this.compareTo(other) === 0;
  }

  // Math.Round(decimal, int) semantics: round half to even.
  round(decimals) {
    if (this.s <= decimals) return this;
    const divisor = pow10(this.s - decimals);
    const q = this.m / divisor;
    const r = this.m % divisor;
    const twice = r * 2n;
    let rounded = q;
    if (twice > divisor || (twice === divisor && q % 2n === 1n)) rounded += 1n;
    return new Decimal(this.neg, rounded, decimals);
  }

  toNumber() {
    return Number(this.toString());
  }

  toString() {
    let digits = this.m.toString();
    if (this.s > 0) {
      if (digits.length <= this.s) digits = '0'.repeat(this.s - digits.length + 1) + digits;
      digits = digits.slice(0, digits.length - this.s) + '.' + digits.slice(digits.length - this.s);
    }
    return (this.neg ? '-' : '') + digits;
  }
}

// Drops least-significant digits (rounding once, not repeatedly) until the value
// fits inside a 96-bit mantissa at a scale of 28 or less.
function fit(neg, m, s) {
  let dropped = s > MAX_SCALE ? s - MAX_SCALE : 0;
  let scaled = dropped > 0 ? divRound(m, pow10(dropped)) : m;
  while (scaled > MAX_MANTISSA && s - dropped > 0) {
    dropped += 1;
    scaled = divRound(m, pow10(dropped));
  }
  if (scaled > MAX_MANTISSA) throw new OverflowError();
  return new Decimal(neg, scaled, s - dropped);
}

Decimal.ZERO = new Decimal(false, 0n, 0);
Decimal.ONE = new Decimal(false, 1n, 0);
Decimal.MAX_VALUE = new Decimal(false, MAX_MANTISSA, 0);

module.exports = { Decimal, OverflowError, DivideByZeroError };
