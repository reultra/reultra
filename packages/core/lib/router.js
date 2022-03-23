class Router {
  constructor() {
    this.stack = [];
  }

  use(route, middleware) {
    this.stack.push({ route, middleware });
  }

  routes() {
    return this.stack.map(({ route }) => route);
  }

  middleware() {
    return async (context, push) => {
      this.stack.forEach(({ route, middleware }) => {
        if (context.route === route) {
          (async () => {
            try {
              await middleware(context, push);
            } catch (error) {
              push(error);
            }
          })();
        }
      });
    };
  }
}

module.exports = Router;
