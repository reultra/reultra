const amqp = require('amqplib');
const { Application } = require('@reultra/core');

class BrokerClient extends Application {
  async connect(...args) {
    this.client = await amqp.connect(...args);
    this.channel = await this.client.createChannel();
    this.handler = this.createHandler();
  }

  async assertExchange(...args) {
    return this.channel.assertExchange(...args);
  }

  async assertQueue(...args) {
    return this.channel.assertQueue(...args);
  }

  async bindQueue(...args) {
    return this.channel.bindQueue(...args);
  }

  async cancel(...args) {
    await this.channel.cancel(...args);
  }

  async consume(queue, options) {
    const session = { ...this.session };
    return this.channel.consume(
      queue,
      (message) => {
        this.handler(session, {
          key: message.fields.routingKey,
          from: message.properties.headers.from,
          packet: {
            type: message.properties.type,
            payload: message.content,
          },
        });
      },
      { noAck: true, ...options }
    );
  }

  publish() {
    return async (session, state, push) => {
      const key = state.key || state.packet.type;
      await this.channel.publish(state.exchange, key, state.packet.payload, {
        type: state.packet.type,
        headers: { from: state.from },
      });
      push();
    };
  }
}

module.exports = BrokerClient;
