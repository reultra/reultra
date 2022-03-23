const { EventEmitter } = require('events');
const compose = require('./middleware/compose');

class Application extends EventEmitter {
  constructor() {
    super();
    this.middleware = [];
  }

  createHandler() {
    return compose(this.middleware);
  }

  use(middleware) {
    this.middleware.push(middleware);
    return this;
  }
}

module.exports = Application;
