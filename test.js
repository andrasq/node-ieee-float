'use strict';

var fp = require('./');

var testValues = [
    0, -0, 1, -1, 1e10, -1e10, 1e-10, -1e-10,
    0.25, Math.pow(2, 40), NaN, Infinity, -Infinity,
    1 * Math.pow(2, 129), 1 * Math.pow(2, -129),
    1.0171355313990822e-45,     // tiny denorm, just 1 bit
    1.102423499998344e-38,      // large denorm, 1.111 2e-127
];

var tmpbuf = new Buffer(8);
var fpbuf = new Buffer(tmpbuf);
function checkValue( t, val, type ) {
    var read = 'read' + type;
    var write = 'write' + type;

    tmpbuf[write](val);
    var expect = tmpbuf[read]();

    var v2 = fp[read](tmpbuf);

    if (isNaN(expect)) t.ok(isNaN(v2), "wanted NaN: " + v2);
    else if (expect == 0 && 1/expect < 0) { t.equal(v2, 0); t.equal(1/v2, -Infinity, "wanted -Infinity: " + v2); }
    else if (expect == 0 && 1/expect > 0) { t.equal(v2, 0); t.equal(1/v2, +Infinity, "wanted +Infinity: " + v2); }
    else t.equal(v2, expect);

    fp[write](fpbuf, val);
    t.deepEqual(fpbuf, tmpbuf, write + ": " + val);
}


module.exports = {
    'read float': function(t) {
        var tests = testValues;

        for (var i=0; i<tests.length; i++) {
            checkValue(t, tests[i], 'FloatLE');
            checkValue(t, tests[i], 'FloatBE');
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
        t.done();
    },

    'float speed 1m': function(t) {
        tmpbuf.writeFloatBE(1.5);

        console.time('Buffer.readFloatBE');
        for (var i=0; i<1000000; i++) tmpbuf.readFloatBE();
        console.timeEnd('Buffer.readFloatBE');

        console.time('Buffer.writeFloatBE');
        for (var i=0; i<1000000; i++) tmpbuf.writeFloatBE(1.5);
        console.timeEnd('Buffer.writeFloatBE');

        console.time('readFloatBE');
        for (var i=0; i<1000000; i++) fp.readFloatBE(tmpbuf);
        console.timeEnd('readFloatBE');

        console.time('writeFloatBE');
        for (var i=0; i<1000000; i++) fp.writeFloatBE(tmpbuf, 1.5);
        console.timeEnd('writeFloatBE');

        t.done();
    },
}
