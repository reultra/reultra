const amqp = require('amqplib');
const { Application } = require('@reultra/core');

const ROOT_EXCHANGE = 'root';

class Channel extends Application {
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
    return async (session, state, push) => {
      push(null, {
        key: state.message.fields.routingKey,
        from: state.raw.properties.headers.from,
        packet: {
          type: state.raw.properties.type,
          payload: state.raw.content,
        },
      });
    };
  }

  async subscribe(key, options = {}) {
    const { exchange = ROOT_EXCHANGE, type = 'topic', consumerTag } = options;
    await this.channel.assertExchange(exchange, type, { durable: false });
    const { queue } = await this.channel.assertQueue('', { exclusive: true });
    await this.channel.bindQueue(queue, exchange, key);
    return this.channel.consume(
      queue,
      (message) => {
        this.handler({ app: this }, { message });
      },
      { consumerTag, noAck: true }
    );
  }

  async cancel(consumerTag) {
    await this.channel.cancel(consumerTag);
  }

  publish(options = {}) {
    const { exchange = ROOT_EXCHANGE } = options;
    return async (session, state, push) => {
      const key = state.key || state.packet.type;
      await this.channel.publish(exchange, key, state.packet.payload, {
        type: state.packet.type,
        headers: { from: state.from },
      });
      push();
    };
  }
}

module.exports = Channel;
