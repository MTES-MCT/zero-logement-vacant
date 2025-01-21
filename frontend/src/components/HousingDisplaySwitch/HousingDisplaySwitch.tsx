import { SegmentedControl } from '@codegouvfr/react-dsfr/SegmentedControl';
import { useAppDispatch } from '../../hooks/useStore';
import housingSlice from '../../store/reducers/housingReducer';

export function HousingDisplaySwitch() {
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
