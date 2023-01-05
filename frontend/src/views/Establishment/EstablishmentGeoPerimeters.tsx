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
} from '../../store/actions/geoAction';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
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
  const dispatch = useDispatch();
  const { trackEvent } = useMatomo();
  const geoPerimeters = useGeoPerimeterList();
  const { loading } = useSelector((state: ApplicationState) => state.geo);
  const [uploadingState, setUploadingState] = useState<
    ActionSteps | undefined
  >();
  const [updatingState, setUpdatingState] = useState<
    GeoPerimeterActionState | undefined
  >();
  const [removingState, setRemovingState] = useState<
    GeoPerimeterActionState | undefined
  >();

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
          onClick={() => {
            setUpdatingState({
              step: ActionSteps.Init,
              geoPerimeter,
            });
          }}
          isSimple
          icon="ri-edit-2-fill"
          iconSize="lg"
          className="d-inline-block fr-mr-1w"
        />
        <ButtonLink
          onClick={() => {
            setRemovingState({
              step: ActionSteps.Init,
              geoPerimeter,
            });
          }}
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
      {uploadingState === ActionSteps.Done && (
        <Alert
          type="success"
          description="Le fichier à été déposé avec succès ! "
          closable
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
        />
      )}
      {removingState?.step === ActionSteps.Done && (
        <Alert
          type="success"
          description="Le périmètre / filtre a été supprimé avec succès !"
          closable
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
      {geoPerimeters && geoPerimeters.length > 0 && (
        <Row>
          <Table
            caption="Périmètres"
            captionPosition="none"
            rowKey="id"
            data={geoPerimeters}
            columns={columns}
            fixedLayout={true}
            className="with-view"
          />
        </Row>
      )}
    </>
  );
};

export default EstablishmentGeoPerimeters;
