import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';

import configureTestStore from '../../../utils/storeUtils';
import PrecisionLists from '../PrecisionLists';

describe('PrecisionLists', () => {
  it('should display fallback texts if there is no precision', async () => {
    const store = configureTestStore();
    render(
      <Provider store={store}>
        <PrecisionLists value={[]} onChange={() => {}} />
      </Provider>
    );

    const mechanism = await screen.findByText('Aucun dispositif');
    expect(mechanism).toBeVisible();
    const blockingPoint = await screen.findByText('Aucun point de blocage');
    expect(blockingPoint).toBeVisible();
    const evolution = await screen.findByText('Aucune évolution');
    expect(evolution).toBeVisible();
  });
});
