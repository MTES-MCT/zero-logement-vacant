import { render, screen, within } from '@testing-library/react';
import HousingEditionForm from './HousingEditionForm';
import { genHousing } from '../../../test/fixtures.test';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router-dom';
import { getHousingState, HousingStatus } from '../../models/HousingState';
import { Housing } from '../../models/Housing';

describe('HousingEditionForm', () => {
  describe('statusOptions', () => {
    it('should include all status for a housing without campaignIds', () => {
      const housing = genHousing();

      render(
        <Router history={createMemoryHistory()}>
          <HousingEditionForm housing={housing} onSubmit={() => {}} />
        </Router>
      );

      const statusOptions = screen.getByTestId('housing-status-options');
      expect(statusOptions).toBeInTheDocument();
      const neverContactedOption = within(statusOptions).queryByText(
        getHousingState(HousingStatus.NeverContacted).title
      );
      expect(neverContactedOption).toBeInTheDocument();
    });

    it('should not include NeverContacted status for a housing with campaignIds', () => {
      const housing: Housing = {
        ...genHousing(),
        campaignIds: ['campaignId'],
      };

      render(
        <Router history={createMemoryHistory()}>
          <HousingEditionForm housing={housing} onSubmit={() => {}} />
        </Router>
      );

      const statusOptions = screen.getByTestId('housing-status-options');
      expect(statusOptions).toBeInTheDocument();
      const neverContactedOption = within(statusOptions).queryByText(
        getHousingState(HousingStatus.NeverContacted).title
      );
      expect(neverContactedOption).not.toBeInTheDocument();
    });
  });
});
