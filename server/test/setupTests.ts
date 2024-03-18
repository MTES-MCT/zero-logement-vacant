import { enableFetchMocks } from 'jest-fetch-mock';
import 'jest-sorted';

enableFetchMocks();

global.beforeEach(() => {
  fetchMock.resetMocks();
});
