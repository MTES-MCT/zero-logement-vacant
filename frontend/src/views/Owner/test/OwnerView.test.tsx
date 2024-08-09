import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter as Router, Route } from 'react-router-dom';

import { genOwnerDTO, OwnerDTO } from '@zerologementvacant/models';
import { AppStore } from '../../../store/store';
import configureTestStore from '../../../utils/test/storeUtils';
import OwnerView from '../OwnerView';
import data from '../../../mocks/handlers/data';

describe('OwnerView', () => {
  let store: AppStore;

  let owner: OwnerDTO;

  beforeEach(() => {
    store = configureTestStore();

    owner = genOwnerDTO();
    data.owners.push(owner);
  });

  describe('if the owner has a BAN address', () => {
    it.todo('should display it');
  });

  describe('if the owner has no BAN address', () => {
    it('should display the DGFIP address instead', async () => {
      render(
        <Provider store={store}>
          <Router initialEntries={[`/proprietaires/${owner.id}`]}>
            <Route path="/proprietaires/:ownerId" component={OwnerView} />
          </Router>
        </Provider>
      );

      owner.rawAddress.forEach((line) => {
        const text = screen.getByText(line);
        expect(text).toBeVisible();
      });
    });
  });
});
