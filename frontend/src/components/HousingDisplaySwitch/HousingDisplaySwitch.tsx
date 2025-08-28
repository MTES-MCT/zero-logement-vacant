import { SegmentedControl } from '@codegouvfr/react-dsfr/SegmentedControl';
import { useAppDispatch, useAppSelector } from '~/hooks/useStore';
import housingSlice from '~/store/reducers/housingReducer';

export function HousingDisplaySwitch() {
  const { view } = useAppSelector((state) => state.housing);
  const dispatch = useAppDispatch();

  const { changeView } = housingSlice.actions;

  function toList() {
    dispatch(changeView('list'));
  }

  function toMap() {
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
            checked: view === 'list',
            title: 'Vue tableau',
            onChange: toList
          }
        },
        {
          iconId: 'fr-icon-map-pin-2-line',
          label: 'Carte',
          nativeInputProps: {
            checked: view === 'map',
            title: 'Vue carte',
            onChange: toMap
          }
        }
      ]}
    />
  );
}
