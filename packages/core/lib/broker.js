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

  async assertExchange(...args) {
    return this.channel.assertExchange(...args);
  }

  async assertQueue(...args) {
    return this.channel.assertQueue(...args);
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

  async consume(...args) {
    return this.channel.consume(...args);
  }
}

module.exports = Broker;
