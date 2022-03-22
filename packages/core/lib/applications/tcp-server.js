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

  listen(...args) {
    const server = new Server();
    server.on('connection', (socket) => {
      const context = {
        app: this,
        state: {},
        buffer: Buffer.alloc(0),
        sender: this.createConnectionUID(),
      };
      socket.setNoDelay(true);
      socket.on('data', (data) => {
        context.buffer = Buffer.concat([context.buffer, data]);
        this.callback(context);
      });
    });
    return server.listen(...args);
  }
}

module.exports = TcpServer;
