import ButtonsGroup from '@codegouvfr/react-dsfr/ButtonsGroup';
import classNames from 'classnames';
import React from 'react';
import {
  TrackEventActions,
  TrackEventCategories,
} from '../../models/TrackEvent';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import { useAppDispatch, useAppSelector } from '../../hooks/useStore';
import housingSlice from '../../store/reducers/housingReducer';

interface Props {
  display?: 'list' | 'map';
}

export function HousingDisplaySwitch(props: Props) {
  const dispatch = useAppDispatch();
  const { trackEvent } = useMatomo();

  const { view } = useAppSelector((state) => state.housing);
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
    <ButtonsGroup
      inlineLayoutWhen="sm and up"
      buttonsSize="medium"
      alignment="right"
      buttons={[
        {
          children: 'Tableau',
          title: 'Vue tableau',
          priority: 'tertiary',
          onClick: toList,
          className: classNames('fr-mr-0', 'color-black-50', {
            'bg-950': view !== 'list',
          }),
        },
        {
          children: 'Cartographie',
          title: 'Vue carte',
          priority: 'tertiary',
          onClick: toMap,
          className: classNames('fr-ml-0', 'color-black-50', {
            'bg-950': view !== 'map',
          }),
        },
      ]}
    />
  );
}
