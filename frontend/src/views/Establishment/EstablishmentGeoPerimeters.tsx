import React, { useState } from 'react';

import {
  Button,
  Checkbox,
  Col,
  File,
  Link,
  Row,
  Table,
  Tag,
  Text,
  Title,
} from '@dataesr/react-dsfr';
import { displayCount, pluralize } from '../../utils/stringUtils';
import { GeoPerimeter } from '../../models/GeoPerimeter';
import ConfirmationModal from '../../components/modals/ConfirmationModal/ConfirmationModal';
import GeoPerimeterEditionModal from '../../components/modals/GeoPerimeterEditionModal/GeoPerimeterEditionModal';
import {
  TrackEventActions,
  TrackEventCategories,
} from '../../models/TrackEvent';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import Alert from '../../components/Alert/Alert';
import ButtonLink from '../../components/ButtonLink/ButtonLink';
import GeoPerimeterUploadingModal from '../../components/modals/GeoPerimeterUploadingModal/GeoPerimeterUploadingModal';
import GeoPerimeterCard from '../../components/GeoPerimeterCard/GeoPerimeterCard';
import classNames from 'classnames';
import Help from '../../components/Help/Help';
import styles from './establishment-geo-perimeters.module.scss';
import { useSelection } from '../../hooks/useSelection';
import SelectableListHeader from '../../components/SelectableListHeader/SelectableListHeader';
import SelectableListHeaderActions from '../../components/SelectableListHeader/SelectableListHeaderActions';
import {
  useDeleteGeoPerimetersMutation,
  useListGeoPerimetersQuery,
  useUpdateGeoPerimeterMutation,
  useUploadGeoPerimeterFileMutation,
} from '../../services/geo.service';

const EstablishmentGeoPerimeters = () => {
  const { trackEvent } = useMatomo();
  const { data: geoPerimeters } = useListGeoPerimetersQuery();
  const [isUploadingModalOpen, setIsUploadingModalOpen] =
    useState<boolean>(false);
  const [geoPerimetersToUpdate, setGeoPerimeterToUpdate] = useState<
    GeoPerimeter | undefined
  >();
  const [geoPerimetersToRemove, setGeoPerimetersToRemove] = useState<
    GeoPerimeter[] | undefined
  >();
  const [isCardView, setIsCardView] = useState<boolean>(false);

  const [
    updateGeoPerimeter,
    {
      isSuccess: isUpdateSuccess,
      originalArgs: updateArgs,
      isError: isUpdateError,
    },
  ] = useUpdateGeoPerimeterMutation();
  const [
    uploadGeoPerimeterFile,
    { isSuccess: isUploadSuccess, isError: isUploadError },
  ] = useUploadGeoPerimeterFileMutation();
  const [
    deleteGeoPerimeters,
    { isSuccess: isDeleteSuccess, isError: isDeleteError },
  ] = useDeleteGeoPerimetersMutation();

  const onSubmitUploadingGeoPerimeter = (file: File) => {
    trackEvent({
      category: TrackEventCategories.GeoPerimeters,
      action: TrackEventActions.GeoPerimeters.Upload,
    });
    uploadGeoPerimeterFile(file)
      .unwrap()
      .finally(() => {
        setIsUploadingModalOpen(false);
      });
  };

  const onSubmitUpdatingGeoPerimeter = (kind: string, name?: string) => {
    if (geoPerimetersToUpdate) {
      trackEvent({
        category: TrackEventCategories.GeoPerimeters,
        action: TrackEventActions.GeoPerimeters.Rename,
      });
      updateGeoPerimeter({
        geoPerimeterId: geoPerimetersToUpdate.id,
        kind,
        name,
      })
        .unwrap()
        .finally(() => {
          setGeoPerimeterToUpdate(undefined);
        });
    }
  };

  const onSubmitRemovingGeoPerimeter = () => {
    if (geoPerimetersToRemove) {
      trackEvent({
        category: TrackEventCategories.GeoPerimeters,
        action: TrackEventActions.GeoPerimeters.Delete,
      });
      deleteGeoPerimeters(geoPerimetersToRemove.map((_) => _.id))
        .unwrap()
        .finally(() => {
          setGeoPerimetersToRemove(undefined);
        });
    }
  };

  const invalidGeoFilters = geoPerimeters?.filter((_) => !_.kind?.length);

  return (
    <>
      {isUploadingModalOpen && (
        <GeoPerimeterUploadingModal
          onSubmit={onSubmitUploadingGeoPerimeter}
          onClose={() => setIsUploadingModalOpen(false)}
        />
      )}
      {geoPerimetersToUpdate && (
        <GeoPerimeterEditionModal
          geoPerimeter={geoPerimetersToUpdate}
          onSubmit={onSubmitUpdatingGeoPerimeter}
          onClose={() => setGeoPerimeterToUpdate(undefined)}
        />
      )}
      {geoPerimetersToRemove !== undefined &&
        geoPerimetersToRemove.length > 0 && (
          <ConfirmationModal
            onSubmit={onSubmitRemovingGeoPerimeter}
            onClose={() => setGeoPerimetersToRemove(undefined)}
          >
            <Text size="md">
              Êtes-vous sûr de vouloir supprimer{' '}
              {pluralize(geoPerimetersToRemove.length)('ce')} 
              {pluralize(geoPerimetersToRemove.length)('périmètre')} ?
            </Text>
          </ConfirmationModal>
        )}
      <Row>
        <Col n="9">
          <Title look="h5" as="h2" className="d-inline-block fr-mr-2w">
            Vos périmètres géographiques ({geoPerimeters?.length})
          </Title>
          <Help className="d-inline-block bg-white">
            Informations actuellement non publiables
          </Help>
        </Col>
        <Col n="3">
          <Button
            onClick={() => setIsUploadingModalOpen(true)}
            className="float-right"
          >
            Déposer un périmètre (.zip)
          </Button>
        </Col>
      </Row>
      <Help className={styles.help}>
        <Text>
          Pour utiliser le filtre “Périmètre” dans la base de données, vous
          pouvez déposer le ou les périmètres géographiques* qui vous
          intéressent : il peut s’agir d’un périmètre correspondant à un
          dispositif de type OPAH ou ORT, mais également d’un quartier en
          particulier, selon vos besoins.
        </Text>
        <Text spacing="mb-0" className="italic">
          *fichier géographique (SIG) au format .zip comprenant l'ensemble des
          extensions qui constituent le fichier (.cpg, .dbf, .shp, etc.).”.
        </Text>
      </Help>
      {isUploadSuccess && (
        <Alert
          type="success"
          description="Le fichier à été déposé avec succès ! "
          closable
          className="fr-mb-2w"
        />
      )}
      {isUpdateSuccess && (
        <Alert
          type="success"
          description={
            'Le périmètre / filtre ' +
            updateArgs?.name +
            ' a été modifié avec succès !'
          }
          closable
          className="fr-mb-2w"
        />
      )}
      {isDeleteSuccess && (
        <Alert
          type="success"
          description="Le périmètre / filtre a été supprimé avec succès !"
          closable
          className="fr-mb-2w"
        />
      )}
      {(isUploadError || isUpdateError || isDeleteError) && (
        <Alert
          type="error"
          description="Une erreur s'est produite, veuillez réessayer."
          closable
          className="fr-mb-2w"
        />
      )}
      {invalidGeoFilters && invalidGeoFilters.length > 0 && (
        <Alert
          description={`Il y a ${displayCount(
            invalidGeoFilters.length,
            'périmètre',
            false
          )} qui ${
            invalidGeoFilters.length === 1
              ? "n'est pas valide"
              : 'ne sont pas valides'
          } car le nom du filtre n'est pas renseigné`}
          type="warning"
          className="fr-mb-2w"
        />
      )}
      <Row justifyContent="right" spacing="my-3w">
        <ButtonLink
          onClick={() => setIsCardView(true)}
          isSimple
          icon="ri-function-fill"
          iconSize="lg"
          className={classNames(
            'd-inline-block',
            'fr-mr-1w',
            'fr-p-1w',
            'bg-975',
            { 'fr-btn--secondary': isCardView }
          )}
        />
        <ButtonLink
          onClick={() => setIsCardView(false)}
          isSimple
          icon="ri-list-check"
          iconSize="lg"
          className={classNames('d-inline-block', 'fr-p-1w', 'bg-975', {
            'fr-btn--secondary': !isCardView,
          })}
        />
      </Row>
      {geoPerimeters && geoPerimeters.length > 0 && (
        <>
          {isCardView ? (
            <Row gutters>
              {geoPerimeters?.map((geoPerimeter) => (
                <Col n="4" key={geoPerimeter.id}>
                  <GeoPerimeterCard
                    geoPerimeter={geoPerimeter}
                    onEdit={setGeoPerimeterToUpdate}
                    onRemove={(geoPerimeter) =>
                      setGeoPerimetersToRemove([geoPerimeter])
                    }
                  />
                </Col>
              ))}
            </Row>
          ) : (
            <GeoPerimetersTable
              geoPerimeters={geoPerimeters}
              onEdit={setGeoPerimeterToUpdate}
              onRemove={setGeoPerimetersToRemove}
            />
          )}
        </>
      )}
    </>
  );
};

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
          total={geoPerimeters.length}
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

export default EstablishmentGeoPerimeters;
