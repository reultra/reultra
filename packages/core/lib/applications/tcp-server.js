const { Buffer } = require('buffer');
const crypto = require('crypto');
const { Server } = require('net');
const Application = require('../application');

class TcpServer extends Application {
  constructor(options = {}) {
    super();
    const { name = crypto.randomUUID() } = options;
    this.name = name;
    this.seq = 1;
    this.sessions = new Map();
  }

  createSession(socket) {
    const session = {
      app: this,
      buffer: Buffer.alloc(0),
      id: `${this.name}.${this.seq}`,
      socket,
    };
    this.seq += 1;
    return session;
  }

  handleConnection(socket) {
    const session = this.createSession(socket);
    this.sessions.set(session.id, session);
    socket.setNoDelay(true);
    socket.on('data', (data) => {
      session.buffer = Buffer.concat([session.buffer, data]);
      this.handler(session, {});
    });
    socket.on('close', () => {
      this.sessions.delete(session.id);
      this.emit('disconnect', session);
    });
    this.emit('connect', session);
  }

  listen(...args) {
    const server = new Server();
    this.handler = this.createHandler();
    server.on('connection', this.handleConnection.bind(this));
    return server.listen(...args);
  }

  send() {
    return (session, state) => {
      const socket = this.sessions.get(state.id)?.socket;
      if (socket) {
        socket.write(state.data);
      }
    };
  }
}

module.exports = TcpServer;
