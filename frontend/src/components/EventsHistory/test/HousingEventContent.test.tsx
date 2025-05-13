import { render, screen } from '@testing-library/react';
import { Occupancy } from '@zerologementvacant/models';

import { genEvent, genHousing, genUser } from '../../../../test/fixtures.test';
import { Event } from '../../../models/Event';
import { Housing, OCCUPANCY_LABELS } from '../../../models/Housing';
import { HousingOccupancyChangeEventContent } from '../HousingEventContent';

describe('HousingEventContent', () => {
  type Updatable = Pick<Housing, 'occupancy' | 'occupancyIntended'>;

  function createEvent(before: Updatable, after: Updatable): Event<Housing> {
    const housingBefore: Housing = { ...genHousing(), ...before };
    const housingAfter: Housing = { ...genHousing(), ...after };
    const creator = genUser();

    return genEvent(housingBefore, housingAfter, creator);
  }

  it('should display all the updated values', async () => {
    const before = {
      occupancy: Occupancy.VACANT,
      occupancyIntended: Occupancy.VACANT
    };
    const after = {
      occupancy: Occupancy.UNKNOWN,
      occupancyIntended: Occupancy.RENT
    };
    const event = createEvent(before, after);

    render(<HousingOccupancyChangeEventContent event={event} />);

    const occupancyBefore = await screen.findByLabelText('Ancienne occupation');
    expect(occupancyBefore).toHaveTextContent(
      OCCUPANCY_LABELS[before.occupancy]
    );
    const occupancyIntendedBefore = await screen.findByLabelText(
      'Ancienne occupation prévisionnelle'
    );
    expect(occupancyIntendedBefore).toHaveTextContent(
      OCCUPANCY_LABELS[before.occupancyIntended]
    );
    const occupancyAfter = await screen.findByLabelText('Nouvelle occupation');
    expect(occupancyAfter).toHaveTextContent(OCCUPANCY_LABELS[after.occupancy]);
    const occupancyIntendedAfter = await screen.findByLabelText(
      'Nouvelle occupation prévisionnelle'
    );
    expect(occupancyIntendedAfter).toHaveTextContent(
      OCCUPANCY_LABELS[after.occupancyIntended]
    );
  });

  it('should display only updated values', () => {
    const before = {
      occupancy: Occupancy.VACANT,
      occupancyIntended: Occupancy.VACANT
    };
    const after = {
      occupancy: Occupancy.VACANT,
      occupancyIntended: Occupancy.RENT
    };
    const event = createEvent(before, after);

    render(<HousingOccupancyChangeEventContent event={event} />);

    const occupancyBefore = screen.queryByText('Ancienne occupation');
    expect(occupancyBefore).toBeNull();
  });
});
