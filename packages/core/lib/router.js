class Router {
  constructor() {
    this.stack = [];
  }

  use(route, middleware) {
    if (middleware === undefined) {
      this.stack.push({ route: '', middleware: route });
    } else {
      this.stack.push({ route, middleware });
    }
  }

  routes() {
    return this.stack.map(({ route }) => route);
  }

  middleware() {
    return async (session, state, push) => {
      let matched = false;
      this.stack.forEach(({ route, middleware }) => {
        if (state.key === route || (route === '' && !matched)) {
          matched = true;
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
