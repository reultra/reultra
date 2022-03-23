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
  }

  createConnectionUID() {
    const uid = `${this.name}/${this.seq}`;
    this.seq += 1;
    return uid;
  }

  createContext() {
    return {
      app: this,
      state: { buffer: Buffer.alloc(0) },
      sender: this.createConnectionUID(),
    };
  }

  listen(...args) {
    const server = new Server();
    const handler = this.createHandler();
    server.on('connection', (socket) => {
      const context = this.createContext();
      this.emit('connect', context);
      socket.setNoDelay(true);
      socket.on('data', (data) => {
        context.state.buffer = Buffer.concat([context.state.buffer, data]);
        handler(context);
      });
      socket.on('close', () => {
        this.emit('disconnect', context);
      });
    });
    return server.listen(...args);
  }
}

module.exports = TcpServer;
