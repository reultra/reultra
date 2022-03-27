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
    this.sockets = new Map();
  }

  createConnectionUID() {
    const uid = `${this.name}/${this.seq}`;
    this.seq += 1;
    return uid;
  }

  createContext() {
    return {
      app: this,
      session: { buffer: Buffer.alloc(0) },
      sender: this.createConnectionUID(),
    };
  }

  listen(...args) {
    const server = new Server();
    const handler = this.createHandler();
    server.on('connection', (socket) => {
      const context = this.createContext();
      this.sockets.set(context.sender, socket);
      this.emit('connect', context);
      socket.setNoDelay(true);
      socket.on('data', (data) => {
        context.session.buffer = Buffer.concat([context.session.buffer, data]);
        handler(context);
      });
      socket.on('close', () => {
        this.sockets.delete(context.sender);
        this.emit('disconnect', context);
      });
    });
    return server.listen(...args);
  }

  send() {
    return (context) => {
      const socket = this.sockets.get(context.sender);
      if (socket) {
        socket.write(context.data);
      }
    };
  }
}

module.exports = TcpServer;
