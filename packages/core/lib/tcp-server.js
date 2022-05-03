const { Server } = require('net');
const { EventEmitter, captureRejectionSymbol } = require('events');

class TcpServer extends EventEmitter {
  constructor(options = {}) {
    super({ captureRejections: true });
    const { deserialize, serialize } = options;
    this.totalConnectionCount = 0;
    this.sessions = new Map();
    if (deserialize) this.deserialize = deserialize.bind(this);
    if (serialize) this.serialize = serialize.bind(this);
  }

  handleConnection(socket) {
    this.totalConnectionCount += 1;
    const id = `session.${this.totalConnectionCount}`;
    const session = { id, socket };
    this.sessions.set(id, session);
    socket.setNoDelay(true);
    let buffer = Buffer.alloc(0);
    socket.on('data', (data) => {
      buffer = Buffer.concat([buffer, data]);
      let message;
      do {
        try {
          message = this.deserialize(session, buffer);
        } catch (error) {
          this.emitError('messageError', error);
          socket.destroy(error);
          return;
        }
        if (message) {
          buffer = buffer.subarray(message.size);
          try {
            this.emit('message', session, message);
          } catch (error) {
            this.emitError('logicError', error, 'message', session, message);
          }
        }
      } while (message);
    });
    socket.on('close', () => {
      this.sessions.delete(id);
      this.emit('disconnect', session);
    });
    socket.on('error', () => {});
    this.emit('connect', session);
  }

  listen(...args) {
    const server = new Server();
    server.on('connection', this.handleConnection.bind(this));
    return server.listen(...args);
  }

  emitError(errorName, error, ...args) {
    if (this.listenerCount(errorName) > 0) {
      this.emit(errorName, error, ...args);
    } else {
      this.emit('error', error);
    }
  }

  [captureRejectionSymbol](error, event, ...args) {
    this.emit('logicError', error, event, ...args);
  }

  // eslint-disable-next-line class-methods-use-this
  deserialize() {
    throw new Error('abstract method deserialize must be implemented');
  }

  // eslint-disable-next-line class-methods-use-this
  serialize() {
    throw new Error('abstract method serialize must be implemented');
  }

  send(sessionId, data) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.socket.write(this.serialize(session, data));
    }
  }
}

module.exports = TcpServer;
