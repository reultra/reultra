const isErrorMiddleware = (middleware) => middleware.length === 3;

const exec = (middleware, parentError, context, push) => {
  (async () => {
    try {
      if (parentError) await middleware(parentError, context, push);
      else await middleware(context, push);
    } catch (error) {
      push(error);
    }
  })();
};

const compose = (middleware) => (rootContext) => {
  const dispatch = (i, parentContext, error, context) => {
    let j = i;
    if (error) {
      while (j < middleware.length && !isErrorMiddleware(middleware[j])) {
        j += 1;
      }
    }
    if (j === middleware.length) {
      if (error) throw error;
      return;
    }
    const nextContext = { ...parentContext, ...context };
    const nextDispatch = dispatch.bind(null, j + 1, nextContext);
    exec(middleware[j], error, nextContext, nextDispatch);
  };
  dispatch(0, rootContext);
};

module.exports = compose;
