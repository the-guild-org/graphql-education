export interface Generator<T> {
  iter: AsyncIterableIterator<T>;
  produce(val: T): void;
}

function createGenerator<T>(): Generator<T> {
  const pending: T[] = [];

  const deferred = {
    done: false,
    error: null as unknown,
    resolve: () => {
      // noop
    },
  };

  const iter = (async function* iter() {
    for (;;) {
      if (!pending.length) {
        // only wait if there are no pending messages available
        await new Promise<void>((resolve) => (deferred.resolve = resolve));
      }
      // first flush
      while (pending.length) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        yield pending.shift()!;
      }
      // then error
      if (deferred.error) {
        throw deferred.error;
      }
      // or complete
      if (deferred.done) {
        return;
      }
    }
  })();

  iter.throw = async (err) => {
    if (!deferred.done) {
      deferred.done = true;
      deferred.error = err;
      deferred.resolve();
    }
    return { done: true, value: undefined };
  };

  iter.return = async () => {
    if (!deferred.done) {
      deferred.done = true;
      deferred.resolve();
    }
    return { done: true, value: undefined };
  };

  return {
    iter,
    produce(val) {
      pending.push(val);
      deferred.resolve();
    },
  };
}

export function createPubSub<T>() {
  const producers: Generator<T>['produce'][] = [];
  return {
    pub(val: T) {
      producers.forEach((next) => next(val));
    },
    sub() {
      const { iter, produce } = createGenerator<T>();
      producers.push(produce);
      const origReturn = iter.return;
      iter.return = () => {
        producers.splice(producers.indexOf(produce), 1);
        return origReturn!();
      };
      return iter;
    },
  };
}
