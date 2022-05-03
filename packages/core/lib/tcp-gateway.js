const TcpServer = require('./tcp-server');
const Broker = require('./broker');

class TcpGateway extends TcpServer {
  constructor(options = {}) {
    super(options);
    this.exchange = options.exchange || 'gateway';
    this.broker = new Broker();
    this.on('connect', this.handleConnect.bind(this));
    this.on('message', this.handleMessage.bind(this));
  }

  async connect(...args) {
    await this.broker.connect(...args);
    await this.broker.assertExchange(this.exchange, 'topic', {
      durable: false,
    });
    const { queue } = await this.broker.assertQueue('', { durable: false });
    await this.broker.bindQueue(queue, this.exchange, 'session.*');
    await this.broker.consume(
      queue,
      (message) => {
        this.send(message.fields.routingKey, message);
      },
      { noAck: true }
    );
  }

  // eslint-disable-next-line class-methods-use-this
  handleConnect(session) {
    session.headers = { sessionId: session.id };
  }

  async handleMessage(session, message) {
    await this.broker.publish(message.service, message.key, message.payload, {
      headers: session.headers,
      type: message.key,
    });
  }
}

module.exports = TcpGateway;
