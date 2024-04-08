import React, { useMemo, useState } from 'react';

import {
  Col,
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalTitle,
  Row,
  Text,
} from '../../_dsfr';
import { displayCount } from '../../../utils/stringUtils';
import { GeoPerimeter } from '../../../models/GeoPerimeter';
import GeoPerimeterEditionModal from '../GeoPerimeterEditionModal/GeoPerimeterEditionModal';
import {
  TrackEventActions,
  TrackEventCategories,
} from '../../../models/TrackEvent';
import { useMatomo } from '@jonkoops/matomo-tracker-react';
import GeoPerimeterUploadingModal from '../GeoPerimeterUploadingModal/GeoPerimeterUploadingModal';
import GeoPerimeterCard from '../../GeoPerimeterCard/GeoPerimeterCard';
import AppHelp from '../../_app/AppHelp/AppHelp';
import {
  useDeleteGeoPerimetersMutation,
  useListGeoPerimetersQuery,
  useUpdateGeoPerimeterMutation,
  useUploadGeoPerimeterFileMutation,
} from '../../../services/geo.service';
import styles from './geo-perimeters-modal.module.scss';
import GeoPerimetersTable from './GeoPerimetersTable';
import AppSearchBar from '../../_app/AppSearchBar/AppSearchBar';
import Button from '@codegouvfr/react-dsfr/Button';
import ButtonsGroup from '@codegouvfr/react-dsfr/ButtonsGroup';
import { Alert } from '@codegouvfr/react-dsfr/Alert';

interface Props {
  onClose: () => void;
}

const GeoPerimetersModal = ({ onClose }: Props) => {
  const { trackEvent } = useMatomo();
  const { data: geoPerimeters } = useListGeoPerimetersQuery();
  const [isUploadingModalOpen, setIsUploadingModalOpen] =
    useState<boolean>(false);
  const [geoPerimetersToUpdate, setGeoPerimeterToUpdate] =
    useState<GeoPerimeter>();
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
    uploadGeoPerimeterFile(file).finally(() => {
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
      }).finally(() => {
        setGeoPerimeterToUpdate(undefined);
      });
    }
  };

  const onSubmitRemovingGeoPerimeter = (geoPerimeters: GeoPerimeter[]) => {
    trackEvent({
      category: TrackEventCategories.GeoPerimeters,
      action: TrackEventActions.GeoPerimeters.Delete,
    });
    deleteGeoPerimeters(geoPerimeters.map((_) => _.id));
  };

  const [query, setQuery] = useState<string>();

  function search(query: string): void {
    setQuery(query);
  }

  async function searchAsync(query: string): Promise<void> {
    search(query);
  }

  const perimeters = useMemo<GeoPerimeter[] | undefined>(
    () =>
      query
        ? geoPerimeters?.filter(
            (perimeter) =>
              perimeter.name.toLowerCase().search(query.toLowerCase()) !== -1 ||
              perimeter.kind.toLowerCase().search(query.toLowerCase()) !== -1,
          )
        : geoPerimeters,
    [query, geoPerimeters],
  );

  const invalidGeoPerimeters = useMemo<GeoPerimeter[] | undefined>(
    () => perimeters?.filter((_) => !_.kind?.length),
    [perimeters],
  );

  return (
    <Modal size="lg" isOpen={true} hide={() => onClose()} className="modal-lg">
      <ModalClose hide={() => onClose()} title="Fermer la fenêtre">
        Fermer
      </ModalClose>
      <ModalTitle>
        Vos périmètres géographiques ({geoPerimeters?.length})
      </ModalTitle>
      <ModalContent>
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
        <AppHelp className={styles.help}>
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
        </AppHelp>
        <Row className="fr-mt-3w fr-mb-1w">
          <Col>
            <div className="flex-1 flex-right">
              <AppSearchBar onSearch={search} onKeySearch={searchAsync} />
              <Button
                onClick={() => setIsUploadingModalOpen(true)}
                priority="secondary"
                className="fr-ml-2w"
              >
                Déposer un périmètre (.zip)
              </Button>
            </div>
          </Col>
          <Col>
            <ButtonsGroup
              alignment="right"
              buttonsEquisized
              inlineLayoutWhen="always"
              buttons={[
                {
                  title: 'Vue liste',
                  iconId: 'fr-icon-layout-grid-fill',
                  priority: isCardView ? 'secondary' : 'primary',
                  onClick: () => setIsCardView(true),
                },
                {
                  title: 'Vue bloc',
                  iconId: 'fr-icon-list-unordered',
                  priority: isCardView ? 'primary' : 'secondary',
                  onClick: () => setIsCardView(false),
                },
              ]}
            ></ButtonsGroup>
          </Col>
        </Row>
        {isUploadSuccess && (
          <Alert
            severity="success"
            description="Le fichier à été déposé avec succès ! "
            closable
            small
            className="fr-mb-2w"
          />
        )}
        {isUpdateSuccess && (
          <Alert
            severity="success"
            description={
              'Le périmètre / filtre ' +
              updateArgs?.name +
              ' a été modifié avec succès !'
            }
            closable
            small
            className="fr-mb-2w"
          />
        )}
        {isDeleteSuccess && (
          <Alert
            severity="success"
            description="Le périmètre / filtre a été supprimé avec succès !"
            closable
            small
            className="fr-mb-2w"
          />
        )}
        {(isUploadError || isUpdateError || isDeleteError) && (
          <Alert
            severity="error"
            description="Une erreur s'est produite, veuillez réessayer."
            closable
            small
            className="fr-mb-2w"
          />
        )}
        {invalidGeoPerimeters && invalidGeoPerimeters.length > 0 && (
          <Alert
            description={`Il y a ${displayCount(
              invalidGeoPerimeters.length,
              'périmètre',
              { capitalize: false },
            )} qui ${
              invalidGeoPerimeters.length === 1
                ? "n'est pas valide"
                : 'ne sont pas valides'
            } car le nom du filtre n'est pas renseigné`}
            severity="warning"
            small
            className="fr-mb-2w"
          />
        )}
        {perimeters && perimeters.length > 0 && (
          <>
            {isCardView ? (
              <Row gutters>
                {perimeters?.map((geoPerimeter) => (
                  <Col n="4" key={geoPerimeter.id}>
                    <GeoPerimeterCard
                      geoPerimeter={geoPerimeter}
                      onEdit={setGeoPerimeterToUpdate}
                      onRemove={(geoPerimeter) =>
                        onSubmitRemovingGeoPerimeter([geoPerimeter])
                      }
                    />
                  </Col>
                ))}
              </Row>
            ) : (
              <GeoPerimetersTable
                geoPerimeters={perimeters}
                onEdit={setGeoPerimeterToUpdate}
                onRemove={onSubmitRemovingGeoPerimeter}
              />
            )}
          </>
        )}
      </ModalContent>
      <ModalFooter>
        <Button onClick={onClose}>Fermer</Button>
      </ModalFooter>
    </Modal>
  );
};

export default GeoPerimetersModal;
