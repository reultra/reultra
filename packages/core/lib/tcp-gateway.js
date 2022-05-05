const TcpServer = require('./tcp-server');

class TcpGateway extends TcpServer {
  constructor(worker, options = {}) {
    super(options);
    this.worker = worker;
    this.broker = worker.broker;
    this.on('connect', this.handleConnect.bind(this));
    this.on('message', this.handleNetMessage.bind(this));
  }

  async connect(...args) {
    await this.worker.connect('gateway', ...args);
    await this.broker.subscribe(
      this.worker.uuid,
      'topic',
      'serverMessages',
      this.handleServerMessage.bind(this)
    );
    await this.broker.subscribe(
      this.worker.uuid,
      'topic',
      'headers',
      this.handleHeaders.bind(this)
    );
    return this;
  }

  handleServerMessage(message) {
    this.send(message.properties.headers.session, message);
  }

  handleConnect(session) {
    session.headers = {
      session: session.id,
      [this.worker.serviceType]: this.worker.uuid,
    };
  }

  handleHeaders(message) {
    const { headers } = message.properties;
    const session = this.sessions.get(headers.session);
    if (session) Object.assign(session.headers, headers);
  }

  async handleNetMessage(session, message) {
    let exchange = session.headers[message.service];
    let routingKey;
    if (exchange) routingKey = 'messages';
    else {
      exchange = message.service;
      routingKey = session.id;
    }
    await this.broker.publish(exchange, routingKey, message.payload, {
      headers: session.headers,
      type: message.key,
    });
  }
}

module.exports = TcpGateway;
