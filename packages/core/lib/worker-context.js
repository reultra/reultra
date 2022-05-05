const { Buffer } = require('buffer');

class WorkerContext {
  constructor(worker, headers) {
    this.worker = worker;
    this.headers = headers;
  }

  async publish(exchange, routingKey, message) {
    return this.worker.broker.publish(
      exchange,
      routingKey,
      this.worker.serialize(message),
      {
        headers: this.headers,
        type: message.constructor.key,
      }
    );
  }

  async send(message) {
    return this.publish(this.headers.gateway, 'serverMessages', message, {
      headers: this.headers,
    });
  }

  async handshake(serviceType, routingKey) {
    return this.worker.broker.publish(
      `${serviceType}Handshake`,
      routingKey,
      Buffer.alloc(0),
      { headers: this.headers }
    );
  }

  async setHeaders(headers) {
    Object.assign(this.headers, headers);
    return this.worker.broker.publish(
      this.headers.gateway,
      'headers',
      Buffer.alloc(0),
      { headers: { ...headers, session: this.headers.session } }
    );
  }
}

module.exports = WorkerContext;
