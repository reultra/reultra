const { Server } = require('net');
const SafeEventEmitter = require('./safe-event-emitter');

class TcpServer extends SafeEventEmitter {
  constructor(options = {}) {
    super({ captureRejections: true });
    const { deserialize, serialize, timeout = 0 } = options;
    this.totalConnectionCount = 0;
    this.timeout = timeout;
    this.sessions = new Map();
    if (deserialize) this.deserialize = deserialize.bind(this);
    if (serialize) this.serialize = serialize.bind(this);
    this.on('data', this.handleData.bind(this));
  }

  handleConnection(socket) {
    this.totalConnectionCount += 1;
    const sessionId = this.totalConnectionCount.toString();
    const session = { id: sessionId, socket };
    this.sessions.set(sessionId, session);
    socket.setNoDelay(true);
    socket.setTimeout(this.timeout);
    const ref = { buffer: Buffer.alloc(0) };
    socket.on('data', this.emit.bind(this, 'data', session, ref));
    socket.on('close', () => {
      this.sessions.delete(sessionId);
      this.emit('disconnect', session);
    });
    socket.on('timeout', this.emit.bind(this, 'timeout', session));
    socket.on('error', () => {});
    this.emit('connect', session);
  }

  listen(...args) {
    const server = new Server();
    server.on('connection', this.handleConnection.bind(this));
    return server.listen(...args);
  }

  handleData(session, ref, data) {
    ref.buffer = Buffer.concat([ref.buffer, data]);
    let message;
    do {
      try {
        message = this.deserialize(session, ref);
      } catch (error) {
        this.emitError('messageError', error);
        session.socket.destroy(error);
        return;
      }
      if (message) {
        this.emitSafe('message', session, message);
      }
    } while (message);
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
