const crypto = require('crypto');
const { Server } = require('net');
const { EventEmitter } = require('events');

class TcpServer extends EventEmitter {
  constructor(options = {}) {
    super();
    const { deserialize, serialize } = options;
    this.uid = crypto.randomUUID();
    this.totalConnectionCount = 0;
    this.sessions = new Map();
    if (deserialize) this.deserialize = deserialize.bind(this);
    if (serialize) this.serialize = serialize.bind(this);
  }

  handleConnection(socket) {
    this.totalConnectionCount += 1;
    const id = `session.${this.totalConnectionCount}`;
    const session = { server: this.uid, id, socket };
    this.sessions.set(id, session);
    socket.setNoDelay(true);
    let buffer = Buffer.alloc(0);
    socket.on('data', (data) => {
      buffer = Buffer.concat([buffer, data]);
      let message;
      do {
        message = this.deserialize(session, buffer);
        if (message) {
          buffer = buffer.subarray(message.size);
          this.emit('message', session, message);
        }
      } while (message);
    });
    socket.on('close', () => {
      this.sessions.delete(id);
      this.emit('disconnect', session);
    });
    this.emit('connect', session);
  }

  listen(...args) {
    const server = new Server();
    server.on('connection', this.handleConnection.bind(this));
    return server.listen(...args);
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
