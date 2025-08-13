import Button from '@codegouvfr/react-dsfr/Button';
import Tag from '@codegouvfr/react-dsfr/Tag';
import { createColumnHelper } from '@tanstack/react-table';

import AdvancedTable from '~/components/AdvancedTable/AdvancedTable';
import { useSelection } from '../../../hooks/useSelection';
import { type GeoPerimeter } from '../../../models/GeoPerimeter';
import AppLink from '../../_app/AppLink/AppLink';
import SelectableListHeader from '../../SelectableListHeader/SelectableListHeader';
import SelectableListHeaderActions from '../../SelectableListHeader/SelectableListHeaderActions';

interface GeoPerimetersTableProps {
  perimeters: GeoPerimeter[];
  onEdit(perimeter: GeoPerimeter): void;
  onRemove(perimeters: GeoPerimeter[]): void;
}

function GeoPerimetersTable(props: GeoPerimetersTableProps) {
  const { perimeters } = props;
  const selection = useSelection(perimeters.length);

  const columnHelper = createColumnHelper<GeoPerimeter>();
  const cols = [
    columnHelper.accessor('name', {
      header: 'Nom du périmètre'
    }),
    columnHelper.accessor('kind', {
      header: 'Filtre',
      cell: ({ row }) => (
        <Tag className="bg-900">
          {row.original.kind ? row.original.kind : 'Non renseigné'}
        </Tag>
      )
    }),
    columnHelper.display({
      id: 'view',
      cell: ({ row }) => (
        <AppLink
          title="Afficher (.json)"
          target="_blank"
          isSimple
          iconId="fr-icon-eye-fill"
          iconPosition="left"
          to={
            'https://geojson.io/#data=data:application/json,' +
            encodeURIComponent(JSON.stringify(row.original.geometry))
          }
        >
          Afficher (.json)
        </AppLink>
      )
    }),
    columnHelper.display({
      id: 'actions',
      cell: ({ row }) => (
        <>
          <Button
            title="Modifier"
            priority="tertiary no outline"
            iconId="fr-icon-edit-fill"
            onClick={() => props.onEdit(row.original)}
          />
          <Button
            title="Supprimer le périmètre"
            priority="tertiary no outline"
            iconId="fr-icon-delete-bin-fill"
            onClick={() => {
              props.onRemove([row.original]);
            }}
          />
        </>
      )
    })
  ];

  const selectedPerimeters = perimeters.filter((geoPerimeter) =>
    selection.selected.all
      ? !selection.selected.ids.includes(geoPerimeter.id)
      : selection.selected.ids.includes(geoPerimeter.id)
  );

  return (
    <>
      <SelectableListHeader
        entity="périmètre"
        selected={selection.selectedCount}
        count={perimeters.length}
        onUnselectAll={() => selection.toggleSelectAll(false)}
      >
        <SelectableListHeaderActions>
          {selection.hasSelected && (
            <Button
              onClick={() => {
                props.onRemove(selectedPerimeters);
              }}
            >
              Supprimer
            </Button>
          )}
        </SelectableListHeaderActions>
      </SelectableListHeader>

      <AdvancedTable
        columns={cols}
        data={perimeters}
        getRowId={(geoPerimeter) => geoPerimeter.id}
        getRowSelectionLabel={(geoPerimeter) =>
          `Sélectionner le périmètre ${geoPerimeter.name}`
        }
        selection={selection.selected}
        onSelectionChange={selection.setSelected}
      />
    </>
  );
}

export default GeoPerimetersTable;
