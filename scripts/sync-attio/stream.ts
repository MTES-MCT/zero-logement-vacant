import highland from 'highland';

export function tapAsync<T>(f: (data: T) => Promise<void>) {
  return (
    error: Error | null,
    data: T | Highland.Nil,
    push: (err: Error | null, value?: T | Highland.Nil) => void,
    next: () => void
  ): void => {
    if (error) {
      push(error);
      next();
      return;
    }

    if (highland.isNil(data)) {
      push(null, highland.nil);
      return;
    }

    f(data)
      .then(() => {
        push(null, data);
      })
      .catch((error) => {
        push(error);
      })
      .finally(() => {
        next();
      });
  };
}
