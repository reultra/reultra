const crypto = require('crypto');
const SafeEventEmitter = require('./safe-event-emitter');
const Broker = require('./broker');
const WorkerContext = require('./worker-context');

class Worker extends SafeEventEmitter {
  constructor(options = {}) {
    const { deserialize, serialize } = options;
    super();
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
    await this.broker.subscribe(
      this.serviceType,
      'x-consistent-hash',
      '1',
      this.emit.bind(this, 'message')
    );
    await this.broker.subscribe(
      `${this.serviceType}Handshake`,
      'x-consistent-hash',
      '1',
      this.handleHandshake.bind(this)
    );
    await this.broker.subscribe(
      this.uuid,
      'topic',
      'messages',
      this.emit.bind(this, 'message')
    );
    return this;
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
    this.emitSafe(
      message.properties.type,
      deserialized,
      new WorkerContext(this, message.properties.headers)
    );
  }

  // eslint-disable-next-line class-methods-use-this
  deserialize() {
    throw new Error('abstract method deserialize must be implemented');
  }

  // eslint-disable-next-line class-methods-use-this
  serialize() {
    throw new Error('abstract method serialize must be implemented');
  }

  async handleHandshake(message) {
    const context = new WorkerContext(this, message.properties.headers);
    return context.setHeaders({ [this.serviceType]: this.uuid });
  }
}

module.exports = Worker;
