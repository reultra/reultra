const { Buffer } = require('buffer');
const crypto = require('crypto');
const { EventEmitter, captureRejectionSymbol } = require('events');
const Broker = require('./broker');

class Worker extends EventEmitter {
  constructor(options = {}) {
    const { deserialize, serialize } = options;
    super({ captureRejections: true });
    this.serviceType = null;
    this.uuid = crypto.randomUUID();
    this.broker = new Broker();
    if (deserialize) this.deserialize = deserialize.bind(this);
    if (serialize) this.serialize = serialize.bind(this);
    this.on('message', this.handleMessage.bind(this));
  }

  async connect(serviceType, ...args) {
    await this.broker.connect(...args);
    this.serviceType = serviceType;
    await this.consume(
      this.serviceType,
      'x-consistent-hash',
      '1',
      this.emit.bind(this, 'message')
    );
    await this.consume(
      `${this.serviceType}Handshake`,
      'x-consistent-hash',
      '1',
      this.handleHandshake.bind(this)
    );
    await this.consume(
      this.uuid,
      'topic',
      'messages',
      this.emit.bind(this, 'message')
    );
    return this;
  }

  async consume(exchangeName, exchangeType, pattern, listener) {
    await this.broker.assertExchange(exchangeName, exchangeType);
    const { queue } = await this.broker.assertQueue();
    await this.broker.bindQueue(queue, exchangeName, pattern);
    await this.broker.consume(queue, listener);
  }

  handleMessage(message) {
    if (this.listenerCount(message.properties.type) === 0) return;
    let deserialized;
    try {
      deserialized = this.deserialize(message);
    } catch (error) {
      this.emitError('messageError', error);
      return;
    }
    try {
      this.emit(
        message.properties.type,
        deserialized,
        message.properties.headers
      );
    } catch (error) {
      this.emitError(
        'logicError',
        error,
        message.properties.type,
        deserialized,
        message.properties.headers
      );
    }
  }

  emitError(errorName, error, ...args) {
    if (this.listenerCount(errorName) > 0) {
      this.emit(errorName, error, ...args);
    } else {
      this.emit('error', error);
    }
  }

  [captureRejectionSymbol](error, event, ...args) {
    this.emitError('logicError', error, event, ...args);
  }

  // eslint-disable-next-line class-methods-use-this
  deserialize() {
    throw new Error('abstract method deserialize must be implemented');
  }

  // eslint-disable-next-line class-methods-use-this
  serialize() {
    throw new Error('abstract method serialize must be implemented');
  }

  async handshake(serviceType, routingKey, headers) {
    return this.broker.publish(
      `${serviceType}Handshake`,
      routingKey,
      Buffer.alloc(0),
      { headers }
    );
  }

  async setHeaders(newHeaders, headers) {
    return this.broker.publish(headers.gateway, 'headers', Buffer.alloc(0), {
      headers: {
        ...newHeaders,
        session: headers.session,
      },
    });
  }

  async handleHandshake(message) {
    const { headers } = message.properties;
    return this.setHeaders({ [this.serviceType]: this.uuid }, headers);
  }

  async publish(exchange, routingKey, message, headers) {
    return this.broker.publish(exchange, routingKey, this.serialize(message), {
      headers,
      type: message.constructor.key,
    });
  }
}

module.exports = Worker;
