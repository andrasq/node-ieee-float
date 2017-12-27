ieee-float
==========
[![Build Status](https://api.travis-ci.org/andrasq/node-ieee-float.svg?branch=master)](https://travis-ci.org/andrasq/node-ieee-float?branch=master)
[![Coverage Status](https://codecov.io/github/andrasq/node-ieee-float/coverage.svg?branch=master)](https://codecov.io/github/andrasq/node-ieee-float?branch=master)


IEEE 754 32-bit and 64-bit floating point JavaScript binary conversion


Read and write 32-bit and 64-bit floating-point numbers to either Arrays
or nodejs Buffers.

    var fp = require('ieee-float');
    var output = [];

    fp.writeFloatLE(output, 1.5);
    // => output = [0, 0, 192, 63]

    var val = fp.readFloatBE(output.reverse());
    // => 1.5


Api
---

### writeFloatLE( buf, val, [offset] )

Store a little-endian 32-bit float into the buffer or array `buf` starting at `offset` (default 0).
No bounds checking is done, will write past the end of the buffer.

### writeFloatBE( buf, val, [offset] )

Store a big-endian 32-bit float into the buffer or array `buf` starting at `offset`.
No bounds checking is done, will write past the end of the buffer.

### readFloatLE( buf, [offset] )

Extract a little-endian 32-bit float from the buffer or array `buf` starting at `offset`.
No bounds checking is done, will read past the end of the array and return 0.

### readFloatBE( buf, [offset] )

Extract a big-endian 32-bit float from the buffer or array `buf` starting at `offset`.
No bounds checking is done, will read past the end of the buffer and return 0.

### writeDoubleLE( buf, val, [offset] )

Store a little-endian 64-bit double into `buf` starting at `offset` (default offset 0).

### writeDoubleBE( buf, val, [offset] )

Store a big-endian 64-bit double into `buf` starting at `offset` (default offset 0).

### readDoubleLE( buf, [offset] )

Extract a little-endian 64-bit double from the bytes in `buf` starting at `offset`.

### readDoubleBE( buf, [offset] )

Extract a big-endian 64-bit double from the bytes in `buf` starting at `offset`.


Benchmark
---------

    qtimeit=0.21.0 node=8.9.2 v8=6.1.534.48 platform=linux kernel=4.14.0-rc5-amd64 up_threshold=false
    arch=ia32 mhz=4514 cpuCount=8 cpu="Intel(R) Core(TM) i7-6700K CPU @ 4.00GHz"
    timeGoal=0.2 opsPerTest=1 forkTests=false
    name                            speed           rate
    nodejs read float          19,397,010 ops/sec   1000 >>>>>
    ieee-float read float      87,027,605 ops/sec   4487 >>>>>>>>>>>>>>>>>>>>>>
    nodejs write float         21,842,992 ops/sec   1126 >>>>>>
    ieee-float write float     34,644,800 ops/sec   1786 >>>>>>>>>
    nodejs read double         17,514,309 ops/sec    903 >>>>>
    ieee-float read double     48,502,363 ops/sec   2501 >>>>>>>>>>>>>
    nodejs write double        20,359,658 ops/sec   1050 >>>>>
    ieee-float write double    40,674,427 ops/sec   2097 >>>>>>>>>>


Todo
----

- perhaps should return NaN (or throw) if reading from outside the array bounds


Related Work
------------

- [qbson](https://github.com/andrasq/node-qbson#readme)
- [messagepackjs](https://npmjs.com/package/messagepackjs)
- [buffalo](https://npmjs.com/package/buffalo)
