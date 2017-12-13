/**
 * pure javascript functions to read and write 32-bit and 64-bit IEEE 754 floating-point
 *
 */

;(function() {
    var exports = this.exports || typeof global !== 'undefined' && global.exports || this;

    var floatBytes = [0, 0, 0, 0];
    var doubleBytes = [0, 0, 0, 0, 0, 0, 0, 0];

    exports.decodeUInt32 = decodeUInt32;
    exports.encodeUInt32 = encodeUInt32;
    exports.readFloat = readFloat;
    exports.writeFloat = writeFloat;
    exports.readDouble = readDouble;
    exports.writeDouble = writeDouble;


    exports.readFloatLE = function readFloatLE( buf, offset ) {
        copyInLE(4, floatBytes, buf, offset);
        return exports.readFloat(floatBytes);
    }

    exports.readFloatBE = function readFloatBE( buf, offset ) {
        copyInBE(4, floatBytes, buf, offset);
        return exports.readFloat(floatBytes);
    }

    exports.readDoubleLE = function readDoubleLE( buf, offset ) {
        copyInLE(8, doubleBytes, buf, offset);
        return exports.readDouble(doubleBytes);
    }

    exports.readDoubleBE = function readDoubleBE( buf, offset ) {
        copyInBE(8, doubleBytes, buf, offset);
        return exports.readDouble(doubleBytes);
    }


    exports.writeFloatLE = function writeFloatLE( buf, v, offset ) {
        exports.writeFloat(floatBytes, v);
        copyOutLE(4, floatBytes, buf, offset);
    };

    exports.writeFloatBE = function writeFloatBE( buf, v, offset ) {
        exports.writeFloat(floatBytes, v);
        copyOutBE(4, floatBytes, buf, offset);
    }

    exports.writeDoubleLE = function writeDoubleLE( buf, v, offset ) {
        exports.writeDouble(doubleBytes, v);
        copyOutLE(8, doubleBytes, buf, offset);
    }

    exports.writeDoubleBE = function writeDoubleLE( buf, v, offset ) {
        exports.writeDouble(doubleBytes, v);
        copyOutBE(8, doubleBytes, buf, offset);
    }


    // accelerate access
    function Dummy() {};
    Dummy.prototype = exports;

}).call(this);


function copyOutLE( n, array, buf, offset ) {
    offset = offset || 0;
    for (var i=0; i<n; i++) buf[offset + i] = array[i];
}

function copyOutBE( n, array, buf, offset ) {
    offset = offset || 0;
    for (var i=0; i<n; i++) buf[offset + i] = array[n - 1 - i];
}

function copyInLE( n, array, buf, offset ) {
    offset = offset || 0;
    for (var i=0; i<n; i++) array[i] = buf[offset + i];
}

function copyInBE( n, array, buf, offset ) {
    offset = offset || 0;
    for (var i=0; i<n; i++) array[n - 1 - i] = buf[offset + i];
}


function decodeUInt32( buf, offs ) {
    return buf[offs++] + (buf[offs++] << 8) + (buf[offs++] << 16) + ((buf[offs++] << 24) >>> 0);
    return buf[0] + (buf[1] << 8) + (buf[2] << 16) + ((buf[3] << 24) >>> 0);
}

function encodeUInt32( buf, v ) {
    buf[0] = (v) & 0xff;
    buf[1] = (v >>> 8) & 0xff;
    buf[2] = (v >>> 16) & 0xff;
    buf[3] = (v >>> 24) & 0xff;
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
function readDouble( buf ) {
    var lowWord = decodeUInt32(buf, 0);
    var highWord = decodeUInt32(buf, 0);
    var mantissa = (highWord & 0x000FFFFF) * _lshift32 + lowWord;
    var exponent = (highWord & 0x7FF00000) >> 20;
    //var sign = (highWord >> 31);

    var value;
    if (exponent === 0x000) {
        // zero if !mantissa, else subnormal (non-normalized reduced precision small value)
        // recover negative zero -0.0 as distinct from 0.0
        // subnormals do not have an implied leading 1 bit and are positioned 1 bit to the left
        value = mantissa ? (mantissa * _rshift52) * pow2(-1023 + 1) : 0.0;
        //value = mantissa ? (mantissa * _rshift52) * 2 * _rshift1023 : 0.0;
        return (highWord >> 31) ? -value : value;
    }
    else if (exponent < 0x7ff) {
        // normalized value with an implied leading 1 bit and 1023 biased exponent
        exponent -= 1023;
        value = (1 + mantissa * _rshift52) * pow2(exponent);
        //value = (1 + mantissa * _rshift52) * pow2(exponent) * _rshift1023;
        return (highWord >> 31) ? -value : value;
    }
    else {
        // Infinity if zero mantissa (+/- per sign), NaN if nonzero mantissa
        return value = mantissa ? NaN : (highWord >> 31) ? -Infinity : Infinity;
    }
}
//
// float32: 1 sign + 8 exponent + 24 mantissa (23 stored, 1 implied)
// see https://en.wikipedia.org/wiki/Single-precision_floating-point_format
// UNTESTED
// Exponent     Mantissa 0      Mantissa > 0    Value
// 00          +0, -0          denormalized     2^(  1-127) * (0. + (mantissa / 2^23))
// 00.. FE                     normalized       2^(exp-127) * (1. + (mantissa / 2^23))
// FF          +/-Infinity     NaN              -
//
var _rshift23 = pow2(-23);      // >> 23 for floats
var _rshift127 = pow2(-127);    // 2^-127
function readFloat( buf ) {
    var word = decodeUInt32(buf, 0);
    var mantissa = (word & 0x007FFFFF);
    var exponent = (word & 0x7F800000) >>> 23;
    //var sign =     (word >> 31);

    var value;
    if (exponent === 0x000) {
        //value = mantissa ? (mantissa * _rshift23) * 2 * _rshift127 : 0.0;
        value = mantissa ? (mantissa * _rshift23) * pow2(-127 + 1) : 0.0;
        return (word >> 31) ? -value : value;
    }
    else if (exponent < 0xff) {
        value = (1 + mantissa * _rshift23) * pow2(exponent) * _rshift127;
        return (word >> 31) ? -value : value;
    }
    else {
        value = mantissa ? NaN : (word >>> 31) ? -Infinity : Infinity;
        return value;
    }
}
// given an exponent n, return 2**n
// n is always an integer, faster to shift when possible
// Note that nodejs Math.pow() is faster than a lookup table (may be caching)
function pow2( exp ) {
    return (exp >= 0) ? (exp <  31 ? (1 << exp) :        Math.pow(2, exp))
                      : (exp > -31 ? (1 / (1 << -exp)) : Math.pow(2, exp));
}

// given a value v, return its integer log_2 (ie, its binary exponent)
// returns the 0-based offset of the msbit set, 0 => 1, +n => 2^n, -n => 2^-n
// The special values 0, -0, NaN, +Infinity and -Infinity are not handled here.
function normalize( v, parts ) {
    var pow = 0;

// FIXME: make O() logarithmic in num bits, not linear
    if (v >= 2) {
        do { v /= 2; pow += 1 } while (v >= 2);
    } else {
        while (v < 1) { v *= 2; pow -= 1 }
    }

    // TODO: pass in num bits, and normalize denorms too

    parts.exp = pow;
    parts.mant = v;
}


var floatArray = [0, 0, 0, 0];
var floatBuf = new Buffer(4);
var floatParts = { exp: 0, mant: 0 };
// float32: 1 sign + 8 exponent + 24 mantissa (23 stored, 1 implied)
var floatOverflow = Math.pow(2, 127);   // FIXME: verify max possible exp, given +127 bias
var floatDenorm = Math.pow(2, -127);    // FIXME: verify min
var floatUnderflow = Math.pow(2, -127 - 23); // FIXME: verify min possible exp, given +127 bias
function writeFloat( buf, v ) {
    var word;
    var sign = (v < 0) ? ((v = -v), 1) : 0;

    if (v === 0) word = (1/v === -Infinity) ? 0x80000000 : 0x00000000;          // -0, +0
    else if (isNaN(v)) word = 0x7FC00000;                                       // NaN
    else if (v === Infinity) word = sign ? 0xFF800000 : 0x7F800000;             // -Infinity, +Infinity
    else {
        normalize(v, floatParts);
        floatParts.exp += 127;          // bias exponent

        if (floatParts.exp <= 0) {       // denormalized number, or underflow
            floatParts.mant /= 2;
// FIXME: make O() logarithmic in num bits, not linear
            while (floatParts.exp < 0) { floatParts.exp += 1; floatParts.mant /= 2 }    // denorm
            floatParts.mant = (floatParts.mant * 0x800000) + 0.5;
            if (floatParts.mant >= 0x800000) { floatParts.exp += 1; floatParts.mant /= 2 }
        }
        else {                          // normal number, or overflow
            floatParts.mant = (floatParts.mant - 1) * 0x800000 + 0.5;
            if (floatParts.mant >= 0x800000) { floatParts.mant /= 2; floatParts.exp += 1 }
            if (floatParts.exp > 254) { floatParts.exp = 255; floatParts.mant = 0 }         // overflow to Infinity
        }

        word = ((sign << 31) >>> 0) | (floatParts.exp << 23) | (floatParts.mant >>> 0);
    }
    encodeUInt32(buf, word);
    return buf;

    buf[0] = (sign << 7) | (floatParts.exp >>> 1);
    buf[1] = ((floatParts.exp << 7) & 0x80) | ((floatParts.mant * 256) & 0xFF);
    buf[2] = ((floatParts.mant * 256*256) & 0xFF);
    buf[3] = ((floatParts.mant * 256*256*256) & 0xFF);
}

var doubleArray = [0, 0, 0, 0, 0, 0, 0, 0];
var doubleBuf = new Buffer(8);
function writeDouble( buf, v ) {
    // WRITEME
    doubleBuf.writeDoubleLE(v, 0);
    for (var i=0; i<8; i++) buf[i] = doubleBuf[i];
    return doubleBuf;
}
