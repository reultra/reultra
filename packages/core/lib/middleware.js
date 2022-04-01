class Middleware {
  static isErrorMiddleware(middleware) {
    return middleware.length === 4;
  }

  static exec(fn, lastError, session, state, push) {
    (async () => {
      try {
        if (lastError) await fn(lastError, session, state, push);
        else await fn(session, state, push);
      } catch (error) {
        push(error);
      }
    })();
  }

  static compose(middleware) {
    return (session, state) => {
      const push = (i, callerState, lastError, userState) => {
        let j = i;
        if (lastError) {
          while (
            j < middleware.length &&
            !this.isErrorMiddleware(middleware[j])
          ) {
            j += 1;
          }
        }
        if (j === middleware.length) {
          if (lastError) throw lastError;
          return;
        }
        const execState = userState ?? { ...callerState };
        const execPush = push.bind(null, j + 1, execState);
        this.exec(middleware[j], lastError, session, execState, execPush);
      };
      push(0, state);
    };
  }
}

module.exports = Middleware;
