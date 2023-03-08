import React, { useEffect, useState } from 'react';

import {
  Button,
  Col,
  File,
  Link,
  Row,
  Table,
  Tag,
  Text,
  Title,
} from '@dataesr/react-dsfr';
import {
  deleteGeoPerimeter,
  updateGeoPerimeter,
  uploadFile,
} from '../../store/actions/establishmentAction';
import { displayCount } from '../../utils/stringUtils';
import { GeoPerimeter } from '../../models/GeoPerimeter';
import ConfirmationModal from '../../components/modals/ConfirmationModal/ConfirmationModal';
import GeoPerimeterEditionModal from '../../components/modals/GeoPerimeterEditionModal/GeoPerimeterEditionModal';
import { useGeoPerimeterList } from '../../hooks/useGeoPerimeterList';
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
import { useAppDispatch, useAppSelector } from '../../hooks/useStore';

enum ActionSteps {
  Init,
  InProgress,
  Done,
}

interface GeoPerimeterActionState {
  step: ActionSteps;
  geoPerimeter: GeoPerimeter;
}

const EstablishmentGeoPerimeters = () => {
  const dispatch = useAppDispatch();
  const { trackEvent } = useMatomo();
  const geoPerimeters = useGeoPerimeterList();
  const { loading } = useAppSelector((state) => state.establishment);
  const [uploadingState, setUploadingState] = useState<
    ActionSteps | undefined
  >();
  const [updatingState, setUpdatingState] = useState<
    GeoPerimeterActionState | undefined
  >();
  const [removingState, setRemovingState] = useState<
    GeoPerimeterActionState | undefined
  >();
  const [isCardView, setIsCardView] = useState<boolean>(true);

  const onSubmitUploadingGeoPerimeter = (file: File) => {
    trackEvent({
      category: TrackEventCategories.GeoPerimeters,
      action: TrackEventActions.GeoPerimeters.Upload,
    });
    setUploadingState(ActionSteps.InProgress);
    dispatch(uploadFile(file));
  };

  useEffect(() => {
    if (uploadingState === ActionSteps.InProgress && !loading) {
      setUploadingState(ActionSteps.Done);
    }
    if (updatingState?.step === ActionSteps.InProgress && !loading) {
      setUpdatingState({
        step: ActionSteps.Done,
        geoPerimeter: updatingState.geoPerimeter,
      });
    }
    if (removingState?.step === ActionSteps.InProgress && !loading) {
      setRemovingState({
        step: ActionSteps.Done,
        geoPerimeter: removingState.geoPerimeter,
      });
    }
  }, [loading]); //eslint-disable-line react-hooks/exhaustive-deps

  const onSubmitUpdatingGeoPerimeter = (kind: string, name?: string) => {
    if (updatingState?.geoPerimeter) {
      trackEvent({
        category: TrackEventCategories.GeoPerimeters,
        action: TrackEventActions.GeoPerimeters.Rename,
      });
      setUpdatingState({
        step: ActionSteps.InProgress,
        geoPerimeter: { ...updatingState.geoPerimeter, name: name ?? '', kind },
      });
      dispatch(updateGeoPerimeter(updatingState?.geoPerimeter.id, kind, name));
    }
  };

  const onSubmitRemovingGeoPerimeter = () => {
    if (removingState?.geoPerimeter) {
      trackEvent({
        category: TrackEventCategories.GeoPerimeters,
        action: TrackEventActions.GeoPerimeters.Delete,
      });
      setRemovingState({
        step: ActionSteps.InProgress,
        geoPerimeter: removingState.geoPerimeter,
      });
      dispatch(deleteGeoPerimeter(removingState.geoPerimeter.id));
    }
  };

  const initEditing = (geoPerimeter: GeoPerimeter) =>
    setUpdatingState({
      step: ActionSteps.Init,
      geoPerimeter,
    });

  const initRemoving = (geoPerimeter: GeoPerimeter) =>
    setRemovingState({
      step: ActionSteps.Init,
      geoPerimeter,
    });
  const invalidGeoFilters = geoPerimeters?.filter((_) => !_.kind?.length);

  return (
    <>
      {uploadingState === ActionSteps.Init && (
        <GeoPerimeterUploadingModal
          onSubmit={onSubmitUploadingGeoPerimeter}
          onClose={() => setUploadingState(undefined)}
        />
      )}
      {updatingState?.step === ActionSteps.Init && (
        <GeoPerimeterEditionModal
          geoPerimeter={updatingState.geoPerimeter}
          onSubmit={onSubmitUpdatingGeoPerimeter}
          onClose={() => setUpdatingState(undefined)}
        />
      )}
      {removingState?.step === ActionSteps.Init && (
        <ConfirmationModal
          onSubmit={onSubmitRemovingGeoPerimeter}
          onClose={() => setRemovingState(undefined)}
        >
          <Text size="md">
            Êtes-vous sûr de vouloir supprimer ce périmètre ?
          </Text>
        </ConfirmationModal>
      )}
      <Row>
        <Col>
          <Title look="h5" as="h2" className="fr-mt-1w">
            Vos périmètres géographiques ({geoPerimeters?.length})
          </Title>
        </Col>
        <Col>
          <Button
            onClick={() => setUploadingState(ActionSteps.Init)}
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
      {uploadingState === ActionSteps.Done && (
        <Alert
          type="success"
          description="Le fichier à été déposé avec succès ! "
          closable
          className="fr-mb-2w"
        />
      )}
      {updatingState?.step === ActionSteps.Done && (
        <Alert
          type="success"
          description={
            'Le périmètre / filtre ' +
            updatingState.geoPerimeter.name +
            ' a été modifié avec succès !'
          }
          closable
          className="fr-mb-2w"
        />
      )}
      {removingState?.step === ActionSteps.Done && (
        <Alert
          type="success"
          description="Le périmètre / filtre a été supprimé avec succès !"
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
                    onEdit={initEditing}
                    onRemove={initRemoving}
                  />
                </Col>
              ))}
            </Row>
          ) : (
            <Row>
              <GeoPerimetersTable
                geoPerimeters={geoPerimeters}
                onEdit={initEditing}
                onRemove={initRemoving}
              />
            </Row>
          )}
        </>
      )}
    </>
  );
};

interface GeoPerimetersTableProps {
  geoPerimeters: GeoPerimeter[];
  onEdit: (geoPerimeter: GeoPerimeter) => void;
  onRemove: (geoPerimeter: GeoPerimeter) => void;
}

const GeoPerimetersTable = ({
  geoPerimeters,
  onEdit,
  onRemove,
}: GeoPerimetersTableProps) => {
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
          onClick={() => onRemove(geoPerimeter)}
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

  const columns = [nameColumn, kindColumn, viewColumn, actionsColumn];
  return (
    <Table
      caption="Périmètres"
      captionPosition="none"
      rowKey="id"
      data={geoPerimeters}
      columns={columns}
      fixedLayout={true}
      className="with-view"
    />
  );
};

export default EstablishmentGeoPerimeters;
