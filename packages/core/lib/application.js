const { EventEmitter } = require('events');
const Middleware = require('./middleware');

class Application extends EventEmitter {
  constructor() {
    super();
    this.middleware = [];
    this.session = { app: this };
  }

  createHandler() {
    return Middleware.compose(this.middleware);
  }

  use(middleware) {
    this.middleware.push(middleware);
    return this;
  }
}

module.exports = Application;
