import React from 'react';

import { Button, Checkbox, Link, Row, Table, Tag } from '@dataesr/react-dsfr';
import { GeoPerimeter } from '../../../models/GeoPerimeter';
import ButtonLink from '../../ButtonLink/ButtonLink';
import { useSelection } from '../../../hooks/useSelection';
import SelectableListHeader from '../../SelectableListHeader/SelectableListHeader';
import SelectableListHeaderActions from '../../SelectableListHeader/SelectableListHeaderActions';

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
      <Checkbox
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
      <Checkbox
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
        <ButtonLink
          onClick={() => onEdit(geoPerimeter)}
          isSimple
          icon="ri-edit-2-fill"
          iconSize="lg"
          className="d-inline-block fr-mr-1w"
        />
        <ButtonLink
          onClick={() => onRemove([geoPerimeter])}
          isSimple
          icon="ri-delete-bin-5-fill"
          iconSize="lg"
          className="d-inline-block"
        />
      </>
    ),
  };

  const viewColumn = {
    name: 'view',
    headerRender: () => '',
    render: ({ geoJson }: GeoPerimeter) => (
      <Link
        title="Afficher (.json)"
        target="_blank"
        isSimple
        display="inline"
        icon="ri-eye-fill"
        iconPosition="left"
        href={
          'https://geojson.io/#data=data:application/json,' +
          encodeURIComponent(JSON.stringify(geoJson))
        }
      >
        Afficher (.json)
      </Link>
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
      : selection.selected.ids.includes(geoPerimeter.id)
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
                <Button
                  title="Supprimer"
                  onClick={() => onRemove(selectedGeoPerimeters)}
                >
                  Supprimer
                </Button>
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
