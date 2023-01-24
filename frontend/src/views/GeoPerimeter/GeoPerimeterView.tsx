import React, { useRef, useState } from 'react';

import {
  Badge,
  Col,
  Container,
  File,
  Link,
  Row,
  Table,
  Tabs,
  Text,
  Title,
} from '@dataesr/react-dsfr';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import {
  deleteGeoPerimeter,
  updateGeoPerimeter,
  uploadFile,
} from '../../store/actions/geoAction';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { displayCount } from '../../utils/stringUtils';
import { GeoPerimeter } from '../../models/GeoPerimeter';
import AppActionsMenu, {
  MenuAction,
} from '../../components/AppActionsMenu/AppActionsMenu';
import ConfirmationModal from '../../components/modals/ConfirmationModal/ConfirmationModal';
import GeoPerimeterEditionModal from '../../components/modals/GeoPerimeterEditionModal/GeoPerimeterEditionModal';
import { useGeoPerimeterList } from '../../hooks/useGeoPerimeterList';
import {
  TrackEventActions,
  TrackEventCategories,
} from '../../models/TrackEvent';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import Tab from '../../components/Tab/Tab';
import Alert from '../../components/Alert/Alert';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const GeoPerimeterView = () => {
  useDocumentTitle('Périmètres');
  const dispatch = useDispatch();
  const { trackEvent } = useMatomo();
  const geoPerimeters = useGeoPerimeterList();

  const FileTypes = ['application/zip', 'application/x-zip-compressed'];

  const { loading } = useSelector((state: ApplicationState) => state.geo);
  const [updatingModalGeoPerimeterId, setUpdatingModalGeoPerimeterId] =
    useState<string | undefined>();
  const [removingModalGeoPerimeterId, setRemovingModalGeoPerimeterId] =
    useState<string | undefined>();
  const [fileError, setFileError] = useState<string | undefined>();

  const tabsRef = useRef<HTMLDivElement | null>(null);

  const selectFile = (event: any) => {
    if (event.target?.files[0]) {
      const file = event.target?.files[0];

      if (FileTypes.indexOf(file.type) !== -1) {
        setFileError(undefined);
        trackEvent({
          category: TrackEventCategories.GeoPerimeters,
          action: TrackEventActions.GeoPerimeters.Upload,
        });
        dispatch(uploadFile(event.target.files[0]));

        const firstTabButton = tabsRef.current?.querySelector(
          'button.fr-tabs__tab'
        );
        if (firstTabButton) {
          firstTabButton.dispatchEvent(
            new MouseEvent('click', {
              view: window,
              bubbles: true,
              cancelable: true,
              buttons: 1,
            })
          );
        }
      } else {
        console.error('Invalid file type', file.type);
        setFileError(`Seuls les fichier zip sont autorisés`);
      }
    } else {
      setFileError('Aucun fichier sélectionné');
    }
  };

  const onSubmitUpdatingGeoPerimeter = (kind: string, name?: string) => {
    if (updatingModalGeoPerimeterId) {
      trackEvent({
        category: TrackEventCategories.GeoPerimeters,
        action: TrackEventActions.GeoPerimeters.Rename,
      });
      dispatch(updateGeoPerimeter(updatingModalGeoPerimeterId, kind, name));
    }
    setUpdatingModalGeoPerimeterId(undefined);
  };

  const onSubmitRemovingGeoPerimeter = () => {
    if (removingModalGeoPerimeterId) {
      trackEvent({
        category: TrackEventCategories.GeoPerimeters,
        action: TrackEventActions.GeoPerimeters.Delete,
      });
      dispatch(deleteGeoPerimeter(removingModalGeoPerimeterId));
    }
    setRemovingModalGeoPerimeterId(undefined);
  };

  const kindColumn = {
    name: 'kind',
    label: 'Nom du filtre',
    render: ({ kind }: GeoPerimeter) => (
      <>
        {kind ? (
          kind
        ) : (
          <Badge isSmall text="Non renseigné" colorFamily="pink-tuile" />
        )}
      </>
    ),
    sortable: true,
  };

  const nameColumn = {
    name: 'name',
    label: 'Entité',
    sortable: true,
  };

  const actionsColumn = {
    name: 'actions',
    headerRender: () => '',
    render: (geoPerimeter: GeoPerimeter) => (
      <>
        <AppActionsMenu
          actions={
            [
              {
                title: 'Modifier',
                onClick: () => {
                  setUpdatingModalGeoPerimeterId(geoPerimeter.id);
                },
              },
              {
                title: 'Supprimer',
                onClick: () => setRemovingModalGeoPerimeterId(geoPerimeter.id),
              },
            ] as MenuAction[]
          }
        />

        {updatingModalGeoPerimeterId === geoPerimeter.id && (
          <GeoPerimeterEditionModal
            geoPerimeter={geoPerimeter}
            onSubmit={onSubmitUpdatingGeoPerimeter}
            onClose={() => setUpdatingModalGeoPerimeterId(undefined)}
          />
        )}
        {removingModalGeoPerimeterId === geoPerimeter.id && (
          <ConfirmationModal
            onSubmit={onSubmitRemovingGeoPerimeter}
            onClose={() => setRemovingModalGeoPerimeterId(undefined)}
          >
            <Text size="md">
              Êtes-vous sûr de vouloir supprimer ce périmètre ?
            </Text>
          </ConfirmationModal>
        )}
      </>
    ),
  };

  const viewColumn = {
    name: 'view',
    headerRender: () => '',
    render: ({ geoJson }: GeoPerimeter) => (
      <Link
        title="Afficher"
        target="_blank"
        isSimple
        display="inline"
        icon="ri-arrow-right-line"
        iconSize="1x"
        iconPosition="right"
        href={
          'https://geojson.io/#data=data:application/json,' +
          encodeURIComponent(JSON.stringify(geoJson))
        }
      >
        Afficher
      </Link>
    ),
  };

  const columns = [kindColumn, nameColumn, actionsColumn, viewColumn];

  const invalidGeoFilters = geoPerimeters?.filter((_) => !_.kind?.length);

  return (
    <>
      <div className="bg-100">
        <Container as="section" spacing="pb-1w">
          <AppBreadcrumb />
          <Row>
            <Col n="8">
              <Title as="h1">Périmètres géographiques</Title>
            </Col>
          </Row>
        </Container>
      </div>
      <Container as="section" spacing="py-4w">
        <div ref={tabsRef}>
          <Tabs>
            <Tab label="Liste des périmètres">
              <>
                {loading || !geoPerimeters ? (
                  <>Chargement en cours...</>
                ) : (
                  <>
                    {invalidGeoFilters && invalidGeoFilters.length > 0 && (
                      <Alert
                        description={`Il y a ${displayCount(
                          invalidGeoFilters.length,
                          'périmètre'
                        )} qui ne sont pas valides car le nom du filtre n'est pas renseigné`}
                        type="warning"
                        className="fr-mb-2w"
                      />
                    )}
                    <Row>
                      <b>{displayCount(geoPerimeters.length, 'périmètre')}</b>
                    </Row>
                    {geoPerimeters.length > 0 && (
                      <Row>
                        <Table
                          caption="Périmètres"
                          captionPosition="none"
                          rowKey="id"
                          data={geoPerimeters}
                          columns={columns}
                          fixedLayout={true}
                          className="with-view with-actions"
                        />
                      </Row>
                    )}
                  </>
                )}
              </>
            </Tab>
            <Tab label="Dépôt de fichier">
              <Row>
                <File
                  onChange={(event: any) => selectFile(event)}
                  multiple={false}
                  label="Périmètre(s) géométrique(s)"
                  hint="Sélectionner un fichier zip uniquement qui contient un ou plusieurs périmètres"
                  errorMessage={fileError}
                />
              </Row>
            </Tab>
          </Tabs>
        </div>
      </Container>
    </>
  );
};

export default GeoPerimeterView;
