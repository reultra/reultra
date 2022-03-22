const compose = require('./middleware/compose');

class Application {
  constructor() {
    this.middleware = [];
  }

  callback(ctx) {
    const fnMiddleware = compose(this.middleware);
    return fnMiddleware.bind(null, ctx);
  }

  use(middleware) {
    this.middleware.push(middleware);
    return this;
  }
}

module.exports = Application;
