'use strict';

var fp = require('./');

var testValues = [
    1024,
    192648575.99999553,
    1e10, 1e203,
    5e-324, 1e-10,
    Math.pow(2, 10), Math.pow(2, 100),

    0, -0, 1, -1, 1e10, -1e10, 1e-10, -1e-10,
    0.25, Math.pow(2, 40), NaN, Infinity, -Infinity,
    1 * Math.pow(2, 129), 1 * Math.pow(2, -129),
    1.0171355313990822e-45,     // tiny denorm, just 1 bit
    1.102423499998344e-38,      // large denorm, 1.111 2e-127
    6.3382528129361155e+29,     // mantissa carry-out rounding error
    4.2199627472983003e-11,     // FloatLE rounding error
    5e-324,
    1.206082573339918e-308,
];

var tmpbuf = new Buffer(10);
var fpbuf = new Buffer(tmpbuf);
function checkValue( t, val, type ) {
    var read = 'read' + type;
    var write = 'write' + type;

    tmpbuf[write](val, 0);
    var expect = tmpbuf[read](0);

    var v2 = fp[read](tmpbuf);

    if (isNaN(expect)) t.ok(isNaN(v2), "wanted NaN: " + v2);
    else if (expect == 0 && 1/expect < 0) { t.equal(v2, 0); t.equal(1/v2, -Infinity, "wanted -0: " + v2 + ", " + 1/v2); }
    else if (expect == 0 && 1/expect > 0) { t.equal(v2, 0); t.equal(1/v2, +Infinity, "wanted +0: " + v2 + ", " + 1/v2); }
    else t.equal(v2, expect);

    fp[write](fpbuf, val);
    t.deepEqual(fpbuf, tmpbuf, write + ": " + val);
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
                }
            }
        }

        t.done();
    },

    'fuzz test float': function(t) {
        // TODO: pick different groups of exponents, bit patterns, and combine them
        for (var pow = -160; pow <= 160; pow++) {
            for (var i=0; i<1000; i++) {
                var val = Math.random() * Math.pow(2, pow);
                checkValue(t, val, 'FloatLE');
            }
        }
        // denorms
        for (var pow = -151; pow <= -126; pow++) {
            for (var i=0; i<10000; i++) {
                var val = Math.random() * Math.pow(2, pow);
                checkValue(t, val, 'FloatBE');
            }
        }
        t.done();
    },

    'fuzz test double': function(t) {
        for (var pow = -1080; pow <= 1080; pow++) {
            for (var i=0; i<200; i++) {
                var val = Math.random() * Math.pow(2, pow);
                checkValue(t, val, 'DoubleLE');
            }
        }
        // denorms
        for (var pow = -1080; pow <= -1023; pow++) {
            for (var i=0; i<1000; i++) {
                var val = Math.random() * Math.pow(2, pow);
                checkValue(t, val, 'DoubleBE');
            }
        }
        t.done();
    },

    'float speed 1m': function(t) {
        tmpbuf.writeFloatBE(1.5);

        console.time('readFloatBE');
        for (var i=0; i<1000000; i++) fp.readFloatBE(tmpbuf);
        console.timeEnd('readFloatBE');

        console.time('writeFloatBE');
        for (var i=0; i<1000000; i++) fp.writeFloatBE(tmpbuf, 1.5);
        console.timeEnd('writeFloatBE');

        console.time('writeFloatLE');
        for (var i=0; i<1000000; i++) fp.writeFloatLE(tmpbuf, 1.5);
        console.timeEnd('writeFloatLE');

        console.time('readDoubleBE');
        for (var i=0; i<1000000; i++) fp.readDoubleBE(tmpbuf);
        console.timeEnd('readDoubleBE');

        console.time('writeDoubleBE');
        for (var i=0; i<1000000; i++) fp.writeDoubleBE(tmpbuf);
        console.timeEnd('writeDoubleBE');

        // TODO: once implemented...
        //console.time('writeDoubleBE');
        //for (var i=0; i<1000000; i++) fp.writeDoubleBE(tmpbuf);
        //console.timeEnd('writeDoubleBE');

        console.time('Buffer.readFloatBE');
        for (var i=0; i<1000000; i++) tmpbuf.readFloatBE();
        console.timeEnd('Buffer.readFloatBE');

        console.time('Buffer.writeFloatBE');
        for (var i=0; i<1000000; i++) tmpbuf.writeFloatBE(1.5);
        console.timeEnd('Buffer.writeFloatBE');

        console.time('Buffer.readDoubleBE');
        for (var i=0; i<1000000; i++) tmpbuf.readDoubleBE();
        console.timeEnd('Buffer.readDoubleBE');

        console.time('Buffer.writeDoubleBE');
        for (var i=0; i<1000000; i++) tmpbuf.writeDoubleBE(1.5);
        console.timeEnd('Buffer.writeDoubleBE');

        t.done();
    },

    'edge cases': {
        'read past end of buffer': function(t) {
t.skip();
            var buf = [0, 0, 0xc0, 0x3f];
            var x = fp.readFloatLE(buf, 1);
console.log("AR:", x);
            t.ok(isNaN(x));
            t.done();
        },

        'read before start of buffer': function(t) {
t.skip();
            var buf = [0, 0, 0xc0, 0x3f];
            var x = fp.readFloatLE(buf, -1);
console.log("AR:", x);
            t.ok(isNaN(x));
            t.done();
        },

    },
}
