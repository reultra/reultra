const { Buffer } = require('buffer');

const DEFAULT_SIZE = 128;
const DEFAULT_FIXED_GROWTH_SIZE = 64;
const DEFAULT_DYNAMIC_GROWTH_FACTOR = 0.5;

class ByteStream {
  constructor(buffer, options = {}) {
    const {
      size = DEFAULT_SIZE,
      dynamic = false,
      growth = dynamic
        ? DEFAULT_DYNAMIC_GROWTH_FACTOR
        : DEFAULT_FIXED_GROWTH_SIZE,
    } = options;
    this.dynamic = dynamic;
    this.growth = growth;
    this._offset = 0;
    if (buffer) {
      this.buffer = buffer;
      this.length = buffer.length;
    } else {
      this.buffer = Buffer.allocUnsafe(size);
      this.length = 0;
    }
  }

  get offset() {
    return this._offset;
  }

  set offset(value) {
    if (value > this.length) {
      this.length = value;
    }
    this._offset = value;
  }

  reset() {
    this.offset = 0;
    this.length = 0;
  }

  skip(offset) {
    this.offset = this._offset + offset;
  }

  toBuffer(start = 0, end = this.length) {
    return this.buffer.subarray(start, end);
  }

  get capacity() {
    return this.buffer.length;
  }

  ensureCapacity(size) {
    const overflow = this._offset + size - this.buffer.length;
    if (overflow > 0) {
      const growth = this.dynamic
        ? Math.ceil(this.buffer.length * this.growth)
        : this.growth;
      this.buffer = Buffer.concat([
        this.buffer,
        Buffer.allocUnsafe(Math.max(overflow, growth)),
      ]);
    }
  }

  isAtEnd() {
    return this.length === this._offset;
  }
}

[
  ['DoubleBE', 8],
  ['DoubleLE', 8],
  ['FloatBE', 4],
  ['FloatLE', 4],
  ['Int8', 1],
  ['Int16BE', 2],
  ['Int16LE', 2],
  ['Int24BE', 3],
  ['Int24LE', 3],
  ['Int32BE', 4],
  ['Int32LE', 4],
  ['Int40BE', 5],
  ['Int40LE', 5],
  ['Int48BE', 6],
  ['Int48LE', 6],
  ['UInt8', 1],
  ['UInt16BE', 2],
  ['UInt16LE', 2],
  ['UInt24BE', 3],
  ['UInt24LE', 3],
  ['UInt32BE', 4],
  ['UInt32LE', 4],
  ['UInt40BE', 5],
  ['UInt40LE', 5],
  ['UInt48BE', 6],
  ['UInt48LE', 6],
].forEach(([type, size]) => {
  const reader = `read${type}`;
  ByteStream.prototype[reader] = function read() {
    const value = this.buffer[reader](this._offset);
    this._offset += size;
    return value;
  };
  const writer = `write${type}`;
  ByteStream.prototype[writer] = function write(value) {
    this.ensureCapacity(size);
    this.buffer[writer](value, this._offset);
    this.offset += size;
  };
});

module.exports = ByteStream;
