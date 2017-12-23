/**
 * pure javascript functions to read and write 32-bit and 64-bit IEEE 754 floating-point
 *
 */

var _2eXp = new Array(); for (var i=0; i<1200; i++) _2eXp[i] = Math.pow(2, i);
var _2eXn = new Array(); for (var i=0; i<1200; i++) _2eXn[i] = Math.pow(2, -i);


;(function install() {
    var exports = this.exports || typeof global !== 'undefined' && global.exports || this;

    exports.readFloatLE = function readFloatLE( buf, offset ) { return exports.readFloat(buf, offset || 0, 'le'); }
    exports.writeFloatLE = function writeFloatLE( buf, v, offset ) { exports.writeFloat(buf, v, offset || 0, 'le'); };
    exports.readFloatBE = function readFloatBE( buf, offset ) { return exports.readFloat(buf, offset || 0, 'bige'); }
    exports.writeFloatBE = function writeFloatBE( buf, v, offset ) { exports.writeFloat(buf, v, offset || 0, 'bige'); }

    exports.readDoubleLE = function readDoubleLE( buf, offset ) { return exports.readDouble(buf, offset || 0, 'le'); }
    exports.writeDoubleLE = function writeDoubleLE( buf, v, offset ) { exports.writeDouble(buf, v, offset || 0, 'le'); }
    exports.readDoubleBE = function readDoubleBE( buf, offset ) { return exports.readDouble(buf, offset || 0, 'bige'); }
    exports.writeDoubleBE = function writeDoubleLE( buf, v, offset ) { exports.writeDouble(buf, v, offset || 0, 'bige'); }

    exports.readFloat = readFloat;
    exports.writeFloat = writeFloat;
    exports.readDouble = readDouble;
    exports.writeDouble = writeDouble;

    // accelerate access
    install.prototype = exports;

}).call(this);


function readWord( buf, offs, dirn ) {
    var a = buf[offs++], b = buf[offs++], c = buf[offs++], d = buf[offs];
    return (dirn === 'bige')
        ? ((a << 24) >>> 0) + (b << 16) + (c << 8) + (d)
        : ((d << 24) >>> 0) + (c << 16) + (b << 8) + (a);
}

function writeWord( buf, v, offs, dirn ) {
    var a = (v >>> 24) & 0xff, b = (v >> 16) & 0xff, c = (v >> 8) & 0xff, d = (v) & 0xff;
    (dirn === 'bige')
        ? (buf[offs++] = a, buf[offs++] = b, buf[offs++] = c, buf[offs] = d)
        : (buf[offs++] = d, buf[offs++] = c, buf[offs++] = b, buf[offs] = a)
}


// getFloat() from qbson, https://github.com/andrasq/node-qbson:
/*
 * extract the 64-bit little-endian ieee 754 floating-point value 
 *   see http://en.wikipedia.org/wiki/Double-precision_floating-point_format
 *   1 bit sign + 11 bits exponent + (1 implicit mantissa 1 bit) + 52 mantissa bits
 *
 * Originally from `json-simple`, then `qbson.decode` - AR.
 * SKL 4.5g 52m/s; readFloatLE 15m/s
 */
var _rshift32 = (1 / 0x100000000);      // >> 32 for floats
var _rshift20 = (1 / 0x100000);         // >> 20 for floats
var _lshift32 = (1 * 0x100000000);      // << 32
var _rshift52 = (1 * _rshift32 * _rshift20);    // >> 52
var _rshift1023 = pow2(-1023);          // 2^-1023
function readDouble( buf, offset, dirn ) {
    if (dirn === 'bige') { var highWord = readWord(buf, offset, 'bige'), lowWord = readWord(buf, offset + 4, 'bige'); }
    else { var highWord = readWord(buf, offset + 4, 'le'), lowWord = readWord(buf, offset, 'le'); }
    var mantissa = (highWord & 0x000FFFFF) * _lshift32 + lowWord;
    var exponent = (highWord & 0x7FF00000) >> 20;
    var sign = (highWord >> 31) || 1;

    var value;
    if (exponent === 0x000) {
        // zero if !mantissa, else subnormal (non-normalized reduced precision small value)
        // recover negative zero -0.0 as distinct from 0.0
        // subnormals do not have an implied leading 1 bit and are positioned 1 bit to the left
        value = mantissa ? (mantissa * pow2(-52 + 1 -1023)) : 0.0;
    }
    else if (exponent < 0x7ff) {
        // normalized value with an implied leading 1 bit and 1023 biased exponent
        value = (1 + mantissa * _rshift52) * pow2(exponent - 1023);
    }
    else {
        // Infinity if zero mantissa (+/- per sign), NaN if nonzero mantissa
        value = mantissa ? NaN : Infinity;
    }

    return sign * value;
}

//
// Note: node-v9 prefers +28% (sign * value), node v6 doesnt care, node v8 likes +16% (-value : value)
//
// float32: 1 sign + 8 exponent + 24 mantissa (23 stored, 1 implied)
// see https://en.wikipedia.org/wiki/Single-precision_floating-point_format
// UNTESTED
// Exponent     Mantissa 0      Mantissa > 0    Value
// 00          +0, -0          denormalized     2^(  1-127) * (0. + (mantissa / 2^23))
// 00.. FE                     normalized       2^(exp-127) * (1. + (mantissa / 2^23))
// FF          +/-Infinity     NaN              -
//
var _rshift23 = Math.pow(2, -23);      // >> 23 for floats
var _rshift127 = Math.pow(2, -127);    // 2^-127
function readFloat( buf, offset, dirn ) {
    var word = readWord(buf, offset, dirn);
    var mantissa = (word & 0x007FFFFF);
    var exponent = (word & 0x7F800000) >>> 23;
    var sign = (word >> 31) || 1;

    var value;
    if (exponent === 0x000) {
        value = mantissa ? mantissa * _rshift23 * 2 * _rshift127 : 0.0;
    }
    else if (exponent < 0xff) {
        value = (1 + mantissa * _rshift23) * pow2(exponent - 127) // * _rshift127;
    }
    else {
        value = mantissa ? NaN : Infinity;
    }

    return sign * value;
    //return (word >>> 31) ? -value : value;
}

// given an exponent n, return 2**n
// n is always an integer, faster to shift when possible
// Note that nodejs Math.pow() is faster than a lookup table (may be caching)
function pow2( exp ) {
    return (exp >= 0) ? _2eXp[exp] : _2eXn[-exp];
    return (exp >= 0) ? (exp <  31 ? (1 << exp) :        Math.pow(2, exp))
                      : (exp > -31 ? (1 / (1 << -exp)) : Math.pow(2, exp));
}

// given a positive value v, normalize it to between 1 and less than 2 with a binary exponent
// The exponent is the number of bit places it was shifted, positive if v was >= 2.
// The special values 0, -0, NaN, +Infinity and -Infinity are not handled here.
// Looping is faster than (Math.log(v) / Math.LN2) in node-v6, v8, and v9.
// This function can account for half the time taken to write a double.
function normalize( v, parts ) {
    var exp = 0;

    if (v >= 2) {
        exp = countDoublings(1, v);
        v *= pow2(-exp);
        if (v >= 2) { v /= 2; exp += 1 }
    }
    else if (v < 1) {
        exp = countDoublings(v, 2);
        if (exp < 1020) v *= pow2(exp);
        else { v *= pow2(exp - 100); v *= pow2(100); }
        exp = -exp;
    }

    // TODO: pass in num bits, and normalize straight to mantissa / denorm

    parts.exp = exp;
    parts.mant = v;
}

// count how many doublings of a are needed for it be close to b.
// Returns a shift count that grows a to be at least b/2 but less than b.
// Doubling 1 toward v ensures that (v >> n) >= 1 < 2,
// and doubling from v toward 2 ensures that (v << n) >= 1 < 2.
var _2e256 = Math.pow(2, 256);
var _2e32 = Math.pow(2, 32);
function countDoublings( a, b ) {
    var n = 0;

    while (a * _2e256 < b) { a *= _2e256; n += 256 }
    while (a * _2e32 < b) { a *= _2e32; n += 32 }
    while (a * 0x10 < b) { a *= 0x10; n += 4 }
    while (a * 2 < b) { a *= 2; n += 1 }

    return n;
}

// round the fraction in v to scale = 2^n bits
// https://blog.angularindepth.com/how-to-round-binary-fractions-625c8fa3a1af
// round to nearest, but round a 0.5 tie to even (0.5 to 0.0 and 1.5 to 2.0)
function roundMantissa( v, scale ) {
    if (v === 1) return scale;
    v *= scale;
    return ((v - Math.floor(v) !== 0.5) || (v & 1)) ? v + 0.5 : v;
}
function roundToEven( v ) {
    if ((v & 1) == 0 && (v - Math.floor(v)) === 0.5) v -= 0.5;
    else v += 0.5;
}

// float32: 1 sign + 8 exponent + 24 mantissa (23 stored, 1 implied)
var norm = { exp: 0, mant: 0 };
function writeFloat( buf, v, offset, dirn ) {
    norm.exp = norm.mant = 0;
    var word, sign = 0;
    if (v < 0) { sign = 1; v = -v; }

    if (! (v && v < Infinity)) {
        if (v === 0) {
            word = (1/v < 0) ? 0x80000000 : 0x00000000;         // -0, +0
        }
        else if (v === Infinity) {
            word = sign ? 0xFF800000 : 0x7F800000;              // -Infinity, +Infinity
        }
        else {
            word = 0x7FC00000;                                  // NaN
        }
    }
    else {
        normalize(v, norm);             // separate exponent and mantissa
        norm.exp += 127;                // bias exponent

        if (norm.exp <= 0) {            // denormalized number
            if (norm.exp <= -25) {      // too small, underflow to zero.  -24 might round up though.
                norm.exp = norm.mant = 0;
            } else {                    // denormalize
                norm.mant = roundMantissa(norm.mant, pow2(22 + norm.exp));
                norm.exp = 0;
            }
        } else {                        // normal number, or overflow
            norm.mant = roundMantissa(norm.mant - 1, 0x800000);
            if (norm.exp > 254) { norm.exp = 255; norm.mant = 0 }               // overflow to Infinity
        }

        // if rounding overflows into the hidden 1s place, hide it and adjust the exponent
        if (norm.mant >= 0x800000) { norm.mant -= 0x800000; norm.exp += 1 }

        word = ((sign << 31) >>> 0) | (norm.exp << 23) | (norm.mant >>> 0);
    }
    writeWord(buf, word, offset, dirn);
}

//   1 bit sign + 11 bits exponent + (1 implicit mantissa 1 bit) + 52 mantissa bits
//
var doubleArray = [0, 0, 0, 0, 0, 0, 0, 0];
var doubleBuf = new Buffer(8);
var _2e52 = Math.pow(2, 52);
var norm = { exp: 0, mant: 0 };
function writeDouble( buf, v, offset, dirn ) {
    norm.exp = norm.mant = 0;
    var highWord, lowWord, sign = 0;
    if (v < 0) { sign = 0x80000000; v = -v; }

    if (! (v && v < Infinity)) {
        if (v === 0) {
            highWord = (1/v < 0) ? 0x80000000 : 0;              // -0, +0
            lowWord = 0;
        }
        else if (v === Infinity) {
            highWord = (sign + 0x7FF00000);                     // -Infinity, +Infinity
            lowWord = 0;
        }
        else {
            highWord = 0x7FF80000;                              // NaN
            lowWord = 0;
        }
    }
    else {
        normalize(v, norm);             // separate exponent and mantissa
        norm.exp += 1023;               // bias exponent

        if (norm.exp <= 0) {            // denormalized
            if (norm.exp <= -52) {
                norm.exp = norm.mant = 0;               // underflow to 0
            } else {
                norm.mant = roundMantissa(norm.mant, pow2(51 + norm.exp));
                norm.exp = 0;
            }
        }
        else {
            norm.mant = roundMantissa(norm.mant - 1, _2e52); // - _2e52;
            if (norm.exp >= 2047) { norm.exp = 2047; norm.mant = 0 }        // overflow to Infinity
        }

        // if rounding overflows into the hidden 1s place, hide it and adjust the exponent
        if (norm.mant >= _2e52) { norm.mant -= _2e52; norm.exp += 1; }  // overflow into hidden 1s bit

        // mask the quotient else javascript rounds the sum
        highWord = sign + (norm.exp << 20) + ((norm.mant / 0x100000000) & 0xFFFFF) ;
        lowWord = norm.mant >>> 0;
    }

    if (dirn === 'bige') { writeWord(buf, highWord, offset, 'bige'); writeWord(buf, lowWord, offset + 4, 'bige') }
    else { writeWord(buf, highWord, offset + 4, 'le'); writeWord(buf, lowWord, offset, 'le') }
}
