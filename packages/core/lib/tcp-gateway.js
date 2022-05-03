const TcpServer = require('./tcp-server');
const Broker = require('./broker');

class TcpGateway extends TcpServer {
  constructor(options = {}) {
    super(options);
    this.broker = new Broker();
    this.on('connect', this.handleConnect.bind(this));
    this.on('message', this.handleMessage.bind(this));
  }

  async connect(...args) {
    await this.broker.connect(...args);
    await this.broker.assertExchange(this.uuid, 'topic', { durable: false });
    const { queue } = await this.broker.assertQueue('', { durable: false });
    await this.broker.bindQueue(queue, this.uuid, 'session.*');
    await this.broker.consume(
      queue,
      (message) => {
        this.send(message.fields.routingKey, message);
      },
      { noAck: true }
    );
  }

  async handleConnect(session) {
    session.headers = { gateway: this.uuid, sessionId: session.id };
  }

  async handleMessage(session, message) {
    // si on veut discuter avec un exchange auth
    // si auth est défini on l'utilise
    // sinon on affecte un id aléatoire qui va être intégré à la routingKey (pour consistent hash)
    // on effectue ensuite un handshake qui va réaffecter un id définitif à la session
    await this.broker.publish(message.service, message.key, message.payload, {
      headers: session.headers,
      type: message.key,
    });
  }
}

module.exports = TcpGateway;
