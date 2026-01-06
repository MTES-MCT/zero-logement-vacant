import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type HousingDTO, type Precision } from '@zerologementvacant/models';
import { genHousingDTO } from '@zerologementvacant/models/fixtures';
import { Provider } from 'react-redux';

import data from '../../../mocks/handlers/data';
import { NULL_PRECISION_ID } from '../../../models/Precision';
import configureTestStore from '../../../utils/storeUtils';
import PrecisionLists from '../PrecisionLists';

interface RenderComponentOptions {
  precisions: ReadonlyArray<Precision>;
}

describe('PrecisionLists', () => {
  const user = userEvent.setup();

  function renderComponent(
    housing: HousingDTO,
    options: RenderComponentOptions
  ): void {
    data.housings.push(housing);
    data.housingPrecisions.set(
      housing.id,
      options.precisions.map((precision) => precision.id)
    );

    const store = configureTestStore();
    render(
      <Provider store={store}>
        <PrecisionLists housingId={housing.id} />
      </Provider>
    );
  }

  beforeEach(() => {
    data.reset();
  });

  it('should display fallback texts if there is no precision', async () => {
    const housing = genHousingDTO(null);

    renderComponent(housing, {
      precisions: []
    });

    const mechanism = await screen.findByText('Aucun dispositif');
    expect(mechanism).toBeVisible();
    const blockingPoint = await screen.findByText('Aucun point de blocage');
    expect(blockingPoint).toBeVisible();
    const evolution = await screen.findByText('Aucune évolution');
    expect(evolution).toBeVisible();
  });

  describe('Null option for radio groups', () => {
    it('should display "Pas d’information" option in evolution radio groups', async () => {
      const housing = genHousingDTO(null);
      const travaux = data.precisions.filter(
        (precision) => precision.category === 'travaux'
      );

      renderComponent(housing, {
        precisions: travaux
      });

      const modify = await screen.findByTitle(
        'Modifier les évolutions du logement'
      );
      await user.click(modify);

      const nullOptions = await screen.findAllByLabelText('Pas d’information');
      expect(nullOptions.length).toBeGreaterThan(0);
    });

    it('should not display "Pas d’information" option in checkbox groups', async () => {
      const housing = genHousingDTO(null);

      renderComponent(housing, {
        precisions: []
      });

      const modify = await screen.findByTitle('Modifier les dispositifs');
      await user.click(modify);

      const nullOptions = screen.queryAllByLabelText('Pas d’information');
      expect(nullOptions).toHaveLength(0);
    });

    it('should have "Pas d’information" checked when no selection exists for that category', async () => {
      const housing = genHousingDTO(null);

      renderComponent(housing, {
        precisions: []
      });

      const modify = await screen.findByTitle(
        'Modifier les évolutions du logement'
      );
      await user.click(modify);

      const nullOptions = await screen.findAllByLabelText('Pas d’information');
      nullOptions.forEach((option) => {
        expect(option).toBeChecked();
      });
    });

    it('should uncheck "Pas d’information" when a real option is selected', async () => {
      const housing = genHousingDTO(null);

      renderComponent(housing, {
        precisions: []
      });

      const modify = await screen.findByTitle(
        'Modifier les évolutions du logement'
      );
      await user.click(modify);

      const realOptions = screen.getAllByRole('radio', {
        name: (accessibleName) => accessibleName !== 'Pas d’information'
      });

      if (realOptions.length > 0) {
        await user.click(realOptions[0]);

        const confirm = await screen.findByRole('button', {
          name: /confirmer/i
        });
        await user.click(confirm);

        const heading = await screen.findByRole('heading', {
          name: 'Évolutions du logement (1)'
        });
        expect(heading).toBeVisible();
      }
    });

    it('should check "Pas d’information" to remove the selection', async () => {
      const housing = genHousingDTO(null);
      const precision: Precision = {
        id: NULL_PRECISION_ID,
        category: 'travaux',
        label: 'Pas d’information'
      };

      renderComponent(housing, {
        precisions: [precision]
      });

      const modify = await screen.findByTitle(
        'Modifier les évolutions du logement'
      );
      await user.click(modify);

      const nullOptions = await screen.findAllByLabelText('Pas d’information');
      if (nullOptions.length > 0) {
        await user.click(nullOptions[0]);
      }

      const confirm = await screen.findByRole('button', {
        name: /confirmer/i
      });
      await user.click(confirm);

      const heading = await screen.findByRole('heading', {
        name: 'Évolutions du logement (0)'
      });
      expect(heading).toBeVisible();
    });
  });
});
