const { EventEmitter, captureRejectionSymbol } = require('events');

class SafeEventEmitter extends EventEmitter {
  constructor() {
    super({ captureRejections: true });
  }

  // process sync and async listeners uniformly
  emitSafe(...args) {
    try {
      this.emit(...args);
    } catch (error) {
      this.emitError('logicError', error, ...args);
    }
  }

  emitError(errorName, error, ...args) {
    if (this.listenerCount(errorName) > 0) {
      this.emit(errorName, error, ...args);
    } else {
      this.emit('error', error);
    }
  }

  [captureRejectionSymbol](error, event, ...args) {
    this.emitError('logicError', error, event, ...args);
  }
}

module.exports = SafeEventEmitter;
