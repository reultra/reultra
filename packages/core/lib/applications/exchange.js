const amqp = require('amqplib');
const Application = require('../application');

class Exchange extends Application {
  constructor() {
    super();
    this.middleware.unshift(this.constructor.consume());
  }

  async connect(...args) {
    this.client = await amqp.connect(...args);
    this.channel = await this.client.createChannel();
    this.handler = this.createHandler();
  }

  // internal middleware
  static consume() {
    return async (context, push) => {
      context.route = context.raw.fields.routingKey;
      context.sender = context.raw.properties.headers.sender;
      context.packet = {
        type: context.raw.properties.type,
        payload: context.raw.content,
      };
      push();
    };
  }

  createContext() {
    return { app: this, state: {} };
  }

  pair(server) {
    server.on('connect', async (context) => {
      const consumerTag = await this.subscribe(context.sender);
      server.on('disconnect', async () => {
        await this.cancel(consumerTag);
      });
    });
  }

  async subscribe(queue) {
    const context = this.createContext();
    await this.channel.assertQueue(queue, { durable: false });
    return this.channel.consume(
      queue,
      (msg) => {
        this.handler({ ...context, raw: msg });
      },
      { noAck: true }
    );
  }

  async cancel(consumerTag) {
    await this.channel.cancel(consumerTag);
  }

  publish() {
    return async (context, push) => {
      context.route ||= context.packet.type;
      await this.channel.assertQueue(context.route, { durable: false });
      await this.channel.sendToQueue(context.route, context.packet.payload, {
        type: context.packet.type,
        headers: { sender: context.sender },
      });
      push();
    };
  }
}

module.exports = Exchange;
