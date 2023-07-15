import { PaginationApi } from '../models/PaginationApi';
import async from 'async';

export function untilEmpty<T>(
  fn: (pagination: PaginationApi) => Promise<T[]>,
  onProgress: (items: T[]) => void
): Promise<void> {
  const perPage = 100;
  let page = 1;
  let length = 0;

  return async.doUntil(
    async () => {
      const data = await fn({
        paginate: true,
        page,
        perPage,
      });
      page++;
      length = data.length;
      onProgress(data);
    },
    async () => length < perPage
  );
}
