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
    return async (session, state, push) => {
      this.stack.forEach(({ route, middleware }) => {
        if (state.key === route) {
          (async () => {
            try {
              await middleware(session, state, push);
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
