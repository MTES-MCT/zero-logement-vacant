import { Row, Table, Text } from '../../_dsfr';
import { GeoPerimeter } from '../../../models/GeoPerimeter';
import { useSelection } from '../../../hooks/useSelection';
import SelectableListHeader from '../../SelectableListHeader/SelectableListHeader';
import SelectableListHeaderActions from '../../SelectableListHeader/SelectableListHeaderActions';
import AppCheckbox from '../../_app/AppCheckbox/AppCheckbox';
import Tag from '@codegouvfr/react-dsfr/Tag';
import Button from '@codegouvfr/react-dsfr/Button';
import AppLink from '../../_app/AppLink/AppLink';
import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';
import { pluralize } from '../../../utils/stringUtils';

interface GeoPerimetersTableProps {
  geoPerimeters: GeoPerimeter[];
  onEdit: (geoPerimeter: GeoPerimeter) => void;
  onRemove: (geoPerimeters: GeoPerimeter[]) => void;
}

const GeoPerimetersTable = ({
  geoPerimeters,
  onEdit,
  onRemove,
}: GeoPerimetersTableProps) => {
  const selection = useSelection(geoPerimeters.length);

  const selectColumn = {
    name: 'select',
    headerRender: () => (
      <AppCheckbox
        checked={selection.hasSelected}
        className={
          selection.selected.ids.length > 0 &&
          selection.selected.ids.length < geoPerimeters.length
            ? 'indeterminate'
            : ''
        }
        label=""
        onChange={() => selection.toggleSelectAll()}
      />
    ),
    render: ({ id }: { id: string }) => (
      <AppCheckbox
        checked={selection.isSelected(id)}
        label=""
        onChange={() => selection.toggleSelect(id)}
        value={id}
      />
    ),
  };
  const kindColumn = {
    name: 'kind',
    label: 'Filtre',
    render: ({ kind }: GeoPerimeter) => (
      <Tag className="bg-900">{kind ? kind : 'Non renseigné'}</Tag>
    ),
    sortable: true,
  };

  const nameColumn = {
    name: 'name',
    label: 'Nom du périmètre',
    sortable: true,
  };

  const actionsColumn = {
    name: 'actions',
    headerRender: () => '',
    render: (geoPerimeter: GeoPerimeter) => (
      <>
        <Button
          title="Modifier"
          priority="tertiary no outline"
          onClick={() => onEdit(geoPerimeter)}
          iconId="fr-icon-edit-fill"
        />
        <ConfirmationModal
          modalId={geoPerimeter.id}
          onSubmit={() => onRemove([geoPerimeter])}
          openingButtonProps={{
            iconId: 'fr-icon-delete-bin-fill',
            priority: 'tertiary no outline',
            title: 'Supprimer',
            className: 'd-inline-block',
          }}
        >
          <Text size="md">
            Êtes-vous sûr de vouloir supprimer ce périmètre ?
          </Text>
        </ConfirmationModal>
      </>
    ),
  };

  const viewColumn = {
    name: 'view',
    headerRender: () => '',
    render: ({ geoJson }: GeoPerimeter) => (
      <AppLink
        title="Afficher (.json)"
        target="_blank"
        isSimple
        iconId="fr-icon-eye-fill"
        iconPosition="left"
        to={
          'https://geojson.io/#data=data:application/json,' +
          encodeURIComponent(JSON.stringify(geoJson))
        }
      >
        Afficher (.json)
      </AppLink>
    ),
  };

  const columns = [
    selectColumn,
    nameColumn,
    kindColumn,
    viewColumn,
    actionsColumn,
  ];

  const selectedGeoPerimeters = geoPerimeters.filter((geoPerimeter) =>
    selection.selected.all
      ? !selection.selected.ids.includes(geoPerimeter.id)
      : selection.selected.ids.includes(geoPerimeter.id),
  );

  return (
    <>
      <header>
        <SelectableListHeader
          entity="périmètre"
          selected={selection.selectedCount}
          count={geoPerimeters.length}
          onUnselectAll={() => selection.toggleSelectAll(false)}
        >
          <SelectableListHeaderActions>
            {selection.hasSelected && (
              <Row justifyContent="right">
                <ConfirmationModal
                  modalId={selectedGeoPerimeters.map((_) => _.id).join('-')}
                  onSubmit={() => onRemove(selectedGeoPerimeters)}
                  openingButtonProps={{ children: 'Supprimer' }}
                >
                  <Text size="md">
                    Êtes-vous sûr de vouloir supprimer{' '}
                    {pluralize(selectedGeoPerimeters.length)('ce')} 
                    {pluralize(selectedGeoPerimeters.length)('périmètre')} ?
                  </Text>
                </ConfirmationModal>
              </Row>
            )}
          </SelectableListHeaderActions>
        </SelectableListHeader>
      </header>
      <Table
        caption="Périmètres"
        captionPosition="none"
        rowKey="id"
        data={geoPerimeters}
        columns={columns}
        fixedLayout={true}
        className="with-view with-select"
      />
    </>
  );
};

export default GeoPerimetersTable;
