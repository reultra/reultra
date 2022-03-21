const { Server } = require('net');
const { v4: uuidv4 } = require('uuid');
const { Buffer } = require('buffer');
const Router = require('../router');

class TcpServer extends Server {
  constructor(options = {}) {
    const { name = uuidv4(), ...rest } = options;
    super(rest);
    this.name = name;
    this.seq = 1;
    this.router = new Router();
    this.on('connection', this.handleConnection.bind(this));
  }

  nextClientId() {
    const uid = `${this.name}-${this.seq}`;
    this.seq += 1;
    return uid;
  }

  handleConnection(socket) {
    // eslint-disable-next-line no-param-reassign
    const context = {
      app: this,
      state: {},
      buffer: Buffer.alloc(0),
      sender: this.nextClientId(),
    };
    socket.setNoDelay(true);
    socket.on('data', (data) => {
      context.buffer = Buffer.concat([context.buffer, data]);
      this.router.handle(context);
    });
  }
}

module.exports = TcpServer;
