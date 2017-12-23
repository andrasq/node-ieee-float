ieee-float
==========
[![Build Status](https://api.travis-ci.org/andrasq/node-ieee-float.svg?branch=master)](https://travis-ci.org/andrasq/node-ieee-float?branch=master)
[![Coverage Status](https://codecov.io/github/andrasq/node-ieee-float/coverage.svg?branch=master)](https://codecov.io/github/andrasq/node-ieee-float?branch=master)


_WORK IN PROGRESS_

IEEE 754 32-bit and 64-bit floating point JavaScript binary conversion


Read and write 32-bit and 64-bit floating-point numbers to either Arrays
or nodejs Buffers.

    var fp = require('ieee-float');
    var output = [];

    fp.writeFloatLE(output, 1.5);
    // => output = [0, 0, 192, 63]


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
No bounds checking is done, will read past the end of the buffer and return NaN.

### readFloatBE( buf, [offset] )

Extract a big-endian 32-bit float from the buffer or array `buf` starting at `offset`.
No bounds checking is done, will read past the end of the buffer and return NaN.

### writeDoubleLE( buf, val, [offset] )

Store a little-endian 64-bit double into `buf` starting at `offset` (default offset 0).
No bounds checking is done, will write past the end of the buffer.

### writeDoubleBE( buf, val, [offset] )

Store a big-endian 64-bit double into `buf` starting at `offset` (default offset 0).
No bounds checking is done, will write past the end of the buffer.

### readDoubleLE( buf, [offset] )

Extract a little-endian 64-bit double from the bytes in `buf` starting at `offset`.

### readDoubleBE( buf, [offset] )

Extract a big-endian 64-bit double from the bytes in `buf` starting at `offset`.



Todo
----


Related Work
------------

- qbson
- messagepackjs
- buffalo
