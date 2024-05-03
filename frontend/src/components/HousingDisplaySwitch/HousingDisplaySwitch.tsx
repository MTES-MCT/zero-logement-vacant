import { SegmentedControl } from '@codegouvfr/react-dsfr/SegmentedControl';
import { useMatomo } from '@jonkoops/matomo-tracker-react';
import React from 'react';

import {
  TrackEventActions,
  TrackEventCategories,
} from '../../models/TrackEvent';
import { useAppDispatch } from '../../hooks/useStore';
import housingSlice from '../../store/reducers/housingReducer';

export function HousingDisplaySwitch() {
  const dispatch = useAppDispatch();
  const { trackEvent } = useMatomo();

  const { changeView } = housingSlice.actions;

  function toList() {
    trackEvent({
      category: TrackEventCategories.HousingList,
      action: TrackEventActions.HousingList.ListView,
    });
    dispatch(changeView('list'));
  }

  function toMap() {
    trackEvent({
      category: TrackEventCategories.HousingList,
      action: TrackEventActions.HousingList.MapView,
    });
    dispatch(changeView('map'));
  }

  return (
    <SegmentedControl
      hideLegend
      segments={[
        {
          iconId: 'fr-icon-table-2',
          label: 'Tableau',
          nativeInputProps: {
            defaultChecked: true,
            title: 'Vue tableau',
            onClick: toList,
          },
        },
        {
          iconId: 'fr-icon-map-pin-2-line',
          label: 'Carte',
          nativeInputProps: {
            title: 'Vue carte',
            onClick: toMap,
          },
        },
      ]}
    />
  );
}
