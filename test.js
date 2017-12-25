/**
 * single- and double-precision floating point implementation test
 *
 * Copyright (C) 2017 Andras Radics
 * Licensed under the Apache License, Version 2.0
 */ 

'use strict';

var fp = require('./');

var testValues = [

    0, -0, 1, -1, 1e10, -1e10, 1e-10, -1e-10, 123e10, -123e10, 123e-10, -123e-10,
    0.25, Math.pow(2, 40), NaN, Infinity, -Infinity,
    1 * Math.pow(2, 129), 1 * Math.pow(2, -129),
    1.0171355313990822e-45,     // tiny denorm, just 1 bit
    1.102423499998344e-38,      // large denorm, 1.111 2e-127
    6.3382528129361155e+29,     // mantissa carry-out rounding error
    4.2199627472983003e-11,     // FloatLE rounding error
    5e-324,
    1.206082573339918e-308,

    1024,
    192648575.99999553,
    1e203,
    Math.pow(2, 10), Math.pow(2, 100),

    1.1754942807573643e-38,     // 0xFFFFFF * Math.pow(2, -126-24), denorm float that rounds to norm
];

var tmpbuf = new Buffer(10);
var fpbuf = new Buffer(tmpbuf);
function checkValue( t, val, type ) {
    var read = 'read' + type;
    var write = 'write' + type;

    if (typeof val === 'number') {
        // nodejs stores NaN from the math library as received, which can be
        // positive/negative/signaling/non-signaling.  Normalize them all to
        // the standard javascript NaN so the bit patterns are identical.
        if (!val && val !== 0) val = NaN;

        tmpbuf[write](val, 0);
    } else {
        for (var i=0; i<8; i++) tmpbuf[i] = val[i];
    }
    var expect = tmpbuf[read](0);

    var v2 = fp[read](tmpbuf, 0);
    if (!expect) {
        if (expect !== 0) t.ok(isNaN(v2), "wanted NaN: " + v2);
        else if (expect == 0 && 1/expect < 0) { t.equal(v2, 0); t.equal(1/v2, -Infinity, "wanted -0: " + v2 + ", " + 1/v2); }
        else if (expect == 0 && 1/expect > 0) { t.equal(v2, 0); t.equal(1/v2, +Infinity, "wanted +0: " + v2 + ", " + 1/v2); }
    }
    else t.equal(v2, expect);

    fp[write](fpbuf, expect);
    if (expect) {
        // compare non-NaN values directly
        // the compareBytes loop is faster than deepEqual, use deepEqual for the message
        if (!compareBytes(fpbuf, tmpbuf, "")) t.deepEqual(fpbuf, tmpbuf, write + " " + expect);
    }
    else {
        // there are many flavors of NaN, check stored (normalized) bit patterns
        // avoid isNaN, it slows the test greatly
        tmpbuf[write](expect, 0);
        if (!compareBytes(fpbuf, tmpbuf, "")) t.deepEqual(fpbuf, tmpbuf, write + " " + expect);
    }
}

function compareBytes( a, b ) {
    for (var i=0; i<8; i++) if (a[i] !== b[i]) return false;
    return true;
}

module.exports = {

    'read and write float': function(t) {
        var tests = testValues;

        for (var i=0; i<tests.length; i++) {
            checkValue(t, tests[i], 'FloatLE');
            checkValue(t, tests[i], 'FloatBE');
        }

        t.done();
    },

    'read and write double': function(t) {
        var tests = testValues;

        for (var i=0; i<tests.length; i++) {
            checkValue(t, tests[i], 'DoubleLE');
            checkValue(t, tests[i], 'DoubleBE');
        }

        t.done();
    },

    'synthetic dataset': function(t) {
        var bitset = [ 0x0, 0x1, 0x11, 0x101, 0x111];
        var bitoffsets = [3, 21, 22, 23, 31, 32, 33, 51, 52, 53];

        for (var base = -1075; base < 1025; base++) {
            for (var bits=0; bits<bitset.length; bits++) {
                for (var bitoffs=0; bitoffs<bitoffsets.length; bitoffs++) {
                    // test with a walking "1.00...0xxx" pattern, with bitpos fraction digits
                    var bitval = bitset[bits];
                    var bitpos = bitoffsets[bitoffs];
                    var val = (1 + bitval * Math.exp(2, -bitpos)) * Math.pow(2, base);
                    checkValue(t, val, 'FloatLE');
                    checkValue(t, val, 'FloatBE');
                    checkValue(t, val, 'DoubleLE');
                    checkValue(t, val, 'DoubleBE');

                    // test with the bit pattern itself
                    var val = (bitval) * Math.pow(2, base);
                    checkValue(t, val, 'FloatLE');
                    checkValue(t, val, 'FloatBE');
                    checkValue(t, val, 'DoubleLE');
                    checkValue(t, val, 'DoubleBE');
                }
            }
        }

        t.done();
    },

    'fuzz test float': function(t) {
        for (var pow = -160; pow <= 160; pow++) {
            for (var i=0; i<1000; i++) {
                // generate a random value between 2^(pow-3) and 2^(pow+3)
                var val = Math.pow(2, pow + ((Math.random() + 1) * 4) - 5);
                checkValue(t, val, 'FloatLE');
            }
        }
        // denorms
        for (var pow = -151; pow <= -126; pow++) {
            for (var i=0; i<1000; i++) {
                var val = Math.pow(2, pow + ((Math.random() + 1) * 4) - 5);
                checkValue(t, val, 'FloatBE');
            }
        }
        t.done();
    },

    'fuzz test double': function(t) {
        for (var pow = -1024; pow <= 1025; pow++) {
            for (var i=0; i<400; i++) {
                var val = Math.pow(2, pow + ((Math.random() + 1) * 4) - 5);
                checkValue(t, val, 'DoubleLE');
            }
        }
        // denorms
        for (var pow = -1075; pow <= -1020; pow++) {
            for (var i=0; i<1000; i++) {
                var val = Math.pow(2, pow + ((Math.random() + 1) * 4) - 5);
                checkValue(t, val, 'DoubleBE');
            }
        }
        t.done();
    },

    'float speed 1m': function(t) {
        tmpbuf.writeFloatBE(1.5, 0);
        var x;

        console.time('readFloatBE');
        for (var i=0; i<1000000; i++) x = fp.readFloatBE(tmpbuf);
        console.timeEnd('readFloatBE');

        console.time('writeFloatBE');
        for (var i=0; i<1000000; i++) fp.writeFloatBE(tmpbuf, 1.5);
        console.timeEnd('writeFloatBE');

        console.time('writeFloatLE');
        for (var i=0; i<1000000; i++) fp.writeFloatLE(tmpbuf, 1.5);
        console.timeEnd('writeFloatLE');

        console.time('readDoubleBE');
        for (var i=0; i<1000000; i++) x = fp.readDoubleBE(tmpbuf);
        console.timeEnd('readDoubleBE');

        console.time('writeDoubleBE');
        for (var i=0; i<1000000; i++) fp.writeDoubleBE(tmpbuf);
        console.timeEnd('writeDoubleBE');

        console.time('Buffer.readFloatBE');
        for (var i=0; i<1000000; i++) x = tmpbuf.readFloatBE(0);
        console.timeEnd('Buffer.readFloatBE');

        console.time('Buffer.writeFloatBE');
        for (var i=0; i<1000000; i++) tmpbuf.writeFloatBE(1.5, 0);
        console.timeEnd('Buffer.writeFloatBE');

        console.time('Buffer.readDoubleBE');
        for (var i=0; i<1000000; i++) x = tmpbuf.readDoubleBE(0);
        console.timeEnd('Buffer.readDoubleBE');

        console.time('Buffer.writeDoubleBE');
        for (var i=0; i<1000000; i++) tmpbuf.writeDoubleBE(1.5, 0);
        console.timeEnd('Buffer.writeDoubleBE');

        t.done();
    },

    'edge cases': {
        'read float from past buffer bounds': function(t) {
            var buf = [0x3f, 0xc0, 0, 0];  // 1.5
            t.equal(fp.readFloatBE(buf, 0), 1.5);
            t.equal(fp.readFloatBE(buf, -1), 0);
            t.equal(fp.readFloatBE(buf, 1), 0);
            t.done();
        },

        'read double from past buffer bounds': function(t) {
            var buf = [0x3f, 0xf8, 0, 0, 0, 0, 0, 0];  // 1.5
            t.equal(fp.readDoubleBE(buf, 0), 1.5);
            t.equal(fp.readDoubleBE(buf, -1), 0);
            t.equal(fp.readDoubleBE(buf, 1), 0);
            t.done();
        },

        'rounded denorm float overflows into hidden 1 bit': function(t) {
            var buf = [0, 0, 0, 0];
            var x = (0xFFFFFF / 0x1000000) * Math.pow(2, -126);
            t.notEqual(x, Math.pow(2, -126));
            fp.writeFloatBE(buf, x);
            t.equal(fp.readFloatBE(buf).toString(16), Math.pow(2, -126).toString(16));
            t.done();
        },

        // TEST underflow, overflow, rounding, rounding that re-normalizes, rounding that overflows

    },

    'exhaustive test float': function(t) {
        // 2017-12-24:  X exhaustive test float (4559260.818ms)
        // Error: the test or one of its setUp/tearDowns did not call done() within 2000 ms
        t.skip();

        var a, b, c, d;
        var valbuf = new Buffer([0,0,0,0,0,0,0,0]);

        // clear temps used by checkValue doubles
        for (var i=0; i<10; i++) {
            tmpbuf[i] = 0;
            fpbuf[i] = 0;
        }

        for (a=0; a<256; a++) {
            valbuf[0] = a;
console.log(a);
            for (b=0; b<256; b++) {
                valbuf[1] = b;
console.log(a, b);
                for (c=0; c<256; c++) {
                    valbuf[2] = c;
                    for (d=0; d<256; d++) {
                        valbuf[3] = d;
                        checkValue(t, valbuf, 'FloatLE');
                        checkValue(t, valbuf, 'FloatBE');
                    }
                }
            }
        }
    },
}
