const isErrorMiddleware = (middleware) => middleware.length === 4;

const exec = (middleware, context, push) => {
  (async () => {
    try {
      await middleware(context, push);
    } catch (error) {
      push(error);
    }
  })();
};

const compose = (middleware) => (rootContext) => {
  const dispatch = (context, i, error) => {
    if (i === middleware.length) {
      if (error) throw error;
      return;
    }
    if (error) {
      let j = i;
      while (j < middleware.length && !isErrorMiddleware(middleware[j])) {
        j += 1;
      }
      dispatch(context, j, error);
    }
    const clonedContext = { ...context };
    const nextDispatch = dispatch.bind(null, clonedContext, i + 1);
    exec(middleware[i], clonedContext, nextDispatch);
  };
  dispatch(rootContext, 0);
};

module.exports = compose;
