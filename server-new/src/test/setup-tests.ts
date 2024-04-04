import { enableFetchMocks } from 'jest-fetch-mock';
import 'jest-extended';
import 'jest-sorted';

enableFetchMocks();

global.beforeEach(() => {
  fetchMock.resetMocks();
});
