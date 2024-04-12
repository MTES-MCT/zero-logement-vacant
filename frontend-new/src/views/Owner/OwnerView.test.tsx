import { render, screen } from '@testing-library/react';
import fetchMock from 'jest-fetch-mock';
import { Provider } from 'react-redux';
import config from '../../utils/config';
import OwnerView from './OwnerView';
import { createMemoryHistory } from 'history';
import { Route, Router } from 'react-router-dom';
import {
  genCampaign,
  genHousing,
  genOwner,
  genPaginatedResult,
} from '../../../test/fixtures.test';
import { format } from 'date-fns';
import { capitalize } from '../../utils/stringUtils';
import { store } from '../../store/store';

describe('Owner view', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  test('should display owner infos', async () => {
    const owner = genOwner();
    const housing1 = genHousing();
    const housing2 = genHousing();

    fetchMock.mockResponse((request: Request) => {
      return Promise.resolve(
        (() => {
          if (request.url === `${config.apiEndpoint}/api/owners/${owner.id}`) {
            return {
              body: JSON.stringify({
                ...owner,
                birthDate: owner.birthDate
                  ? format(owner.birthDate, 'yyyy-MM-dd')
                  : undefined,
              }),
              init: { status: 200 },
            };
          } else if (request.url === `${config.apiEndpoint}/api/housing`) {
            return {
              body: JSON.stringify(genPaginatedResult([housing1, housing2])),
              init: { status: 200 },
            };
          } else if (
            request.url === `${config.apiEndpoint}/api/events/owner/${owner.id}`
          ) {
            return {
              body: JSON.stringify([]),
              init: { status: 200 },
            };
          } else if (request.url === `${config.apiEndpoint}/api/campaigns`) {
            return {
              body: JSON.stringify([genCampaign()]),
              init: { status: 200 },
            };
          } else return { body: '', init: { status: 404 } };
        })(),
      );
    });

    const history = createMemoryHistory({
      initialEntries: [`/proprietaires/${owner.id}`],
    });

    render(
      <Provider store={store}>
        <Router history={history}>
          <Route exact path="/proprietaires/:ownerId" component={OwnerView} />
        </Router>
      </Provider>,
    );

    await screen.findByText(capitalize(owner.fullName));
    if (owner.birthDate) {
      await screen.findByText(
        `né(e) le ${format(owner.birthDate, 'dd/MM/yyyy')}`,
      );
    }
    if (owner.email) {
      await screen.findByText(owner.email);
    }
    if (owner.phone) {
      await screen.findByText(owner.phone);
    }
  });
});
