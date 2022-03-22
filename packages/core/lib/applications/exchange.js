const amqp = require('amqplib');

class Exchange {
  async connect(url = 'amqp://localhost', options = {}) {
    this.client = await amqp.connect(url, options);
    this.channel = await this.client.createChannel();
  }


}

module.exports = Exchange;

const amqp = require('amqplib');

const DEFAULT_URL = 'amqp://localhost';

const consume = async (options) => {
  const { url = DEFAULT_URL, ...ampqOptions } = options;
  const client = await amqp.connect(url, ampqOptions);
  const channel = await client.createChannel();
  return async (context, push) => {
    await channel.assertQueue(context.route, { durable: false });
    await channel.consume(
      context.route,
      (rabbitMessage) => {
        try {
          context.sender = rabbitMessage.properties.headers.sender;
          context.packet = {
            type: rabbitMessage.properties.type,
            payload: rabbitMessage.content,
          };
          push();
        } catch (error) {
          push(error);
        }
      },
      { noAck: true }
    );
  };
};

const publish = async (options) => {
  const { url = DEFAULT_URL, ...ampqOptions } = options;
  const client = await amqp.connect(url, ampqOptions);
  const channel = await client.createChannel();
  return async (context, push) => {
    const route = context.route || context.packet.type;
    await channel.assertQueue(route, { durable: false });
    await channel.sendToQueue(route, context.packet.payload, {
      type: context.packet.type,
      headers: { sender: context.sender },
    });
    push();
  };
};

module.exports = { consume, publish };
