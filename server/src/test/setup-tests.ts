import { enableFetchMocks } from 'jest-fetch-mock';
import 'jest-extended';
import 'jest-sorted';

import queue from '~/infra/queue';

enableFetchMocks();

global.beforeEach(() => {
  fetchMock.resetMocks();
});

global.afterEach(async () => {
  await queue.close();
});
