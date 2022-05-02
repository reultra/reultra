const { EventEmitter, captureRejectionSymbol } = require('events');
const Broker = require('./broker');

class MessageManager extends EventEmitter {
  constructor(options = {}) {
    const { deserialize, serialize } = options;
    super({ captureRejections: true });
    this.broker = new Broker();
    if (deserialize) this.deserialize = deserialize.bind(this);
    if (serialize) this.serialize = serialize.bind(this);
  }

  async connect(...args) {
    await this.broker.connect(...args);
  }

  async subscribe(exchange, pattern) {
    await this.broker.assertExchange(exchange, 'topic', { durable: false });
    const { queue } = await this.broker.assertQueue('', { durable: false });
    await this.broker.bindQueue(queue, exchange, pattern);
    return this.broker.consume(
      queue,
      (message) => {
        this.emit('message', message);
        if (this.listenerCount(message.properties.type) > 0) {
          const deserialized = this.deserialize(message);
          try {
            this.emit(
              message.properties.type,
              deserialized,
              message.properties.headers
            );
          } catch (error) {
            this.emit(
              'logicError',
              error,
              message.properties.type,
              deserialized,
              message.properties.headers
            );
          }
        }
      },
      { noAck: true }
    );
  }

  [captureRejectionSymbol](error, event, ...args) {
    this.emit('logicError', error, event, ...args);
  }

  // eslint-disable-next-line class-methods-use-this
  deserialize() {
    throw new Error('abstract method deserialize must be implemented');
  }

  // eslint-disable-next-line class-methods-use-this
  serialize() {
    throw new Error('abstract method serialize must be implemented');
  }

  async publish(exchange, queue, message, options) {
    return this.broker.publish(exchange, queue, this.serialize(message), {
      type: message.constructor.key,
      ...options,
    });
  }
}

module.exports = MessageManager;
