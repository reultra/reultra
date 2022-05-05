const { EventEmitter } = require('events');
const amqp = require('amqplib');

class Broker extends EventEmitter {
  static async connect(...args) {
    const broker = new this();
    await broker.connect(...args);
    return broker;
  }

  async connect(...args) {
    this.client = await amqp.connect(...args);
    this.channel = await this.client.createChannel();
  }

  async assertExchange(exchange, type, options) {
    return this.channel.assertExchange(exchange, type, {
      durable: false,
      autoDelete: true,
      ...options,
    });
  }

  async assertQueue(queue, options) {
    return this.channel.assertQueue(queue, {
      durable: false,
      autoDelete: true,
      ...options,
    });
  }

  async bindQueue(...args) {
    return this.channel.bindQueue(...args);
  }

  async cancel(consumerTag) {
    return this.channel.cancel(consumerTag);
  }

  async publish(...args) {
    return this.channel.publish(...args);
  }

  async consume(queue, listener, options) {
    return this.channel.consume(queue, listener, {
      noAck: true,
      ...options,
    });
  }

  async subscribe(exchangeName, exchangeType, pattern, listener) {
    await this.assertExchange(exchangeName, exchangeType);
    const { queue } = await this.assertQueue();
    await this.bindQueue(queue, exchangeName, pattern);
    await this.consume(queue, listener);
  }
}

module.exports = Broker;
