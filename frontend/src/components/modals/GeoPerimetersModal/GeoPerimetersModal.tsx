import React, { useMemo, useState } from 'react';

import {
  Button,
  ButtonGroup,
  Col,
  File,
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalTitle,
  Row,
  Text,
} from '@dataesr/react-dsfr';
import { displayCount, pluralize } from '../../../utils/stringUtils';
import { GeoPerimeter } from '../../../models/GeoPerimeter';
import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';
import GeoPerimeterEditionModal from '../GeoPerimeterEditionModal/GeoPerimeterEditionModal';
import {
  TrackEventActions,
  TrackEventCategories,
} from '../../../models/TrackEvent';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import Alert from '../../Alert/Alert';
import GeoPerimeterUploadingModal from '../GeoPerimeterUploadingModal/GeoPerimeterUploadingModal';
import GeoPerimeterCard from '../../GeoPerimeterCard/GeoPerimeterCard';
import Help from '../../Help/Help';
import {
  useDeleteGeoPerimetersMutation,
  useListGeoPerimetersQuery,
  useUpdateGeoPerimeterMutation,
  useUploadGeoPerimeterFileMutation,
} from '../../../services/geo.service';
import styles from './geo-perimeters-modal.module.scss';
import GeoPerimetersTable from './GeoPerimetersTable';
import AppSearchBar from '../../AppSearchBar/AppSearchBar';

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
  const [geoPerimetersToRemove, setGeoPerimetersToRemove] =
    useState<GeoPerimeter[]>();
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

  const onSubmitRemovingGeoPerimeter = () => {
    if (geoPerimetersToRemove) {
      trackEvent({
        category: TrackEventCategories.GeoPerimeters,
        action: TrackEventActions.GeoPerimeters.Delete,
      });
      deleteGeoPerimeters(geoPerimetersToRemove.map((_) => _.id)).finally(
        () => {
          setGeoPerimetersToRemove(undefined);
        }
      );
    }
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
              perimeter.kind.toLowerCase().search(query.toLowerCase()) !== -1
          )
        : geoPerimeters,
    [query, geoPerimeters]
  );

  const invalidGeoPerimeters = useMemo<GeoPerimeter[] | undefined>(
    () => perimeters?.filter((_) => !_.kind?.length),
    [perimeters]
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
        <Row className="fr-mt-3w fr-mb-1w">
          <Col>
            <div className="flex-1 flex-right">
              <AppSearchBar onSearch={search} onKeySearch={searchAsync} />
              <Button
                onClick={() => setIsUploadingModalOpen(true)}
                secondary
                className="fr-ml-2w"
              >
                Déposer un périmètre (.zip)
              </Button>
            </div>
          </Col>
          <Col>
            <ButtonGroup isInlineFrom="xs" size="md" align="right">
              <Button
                title="Vue liste"
                icon="ri-function-fill"
                secondary={isCardView}
                onClick={() => setIsCardView(true)}
              />
              <Button
                title="Vue bloc"
                icon="ri-list-check"
                secondary={!isCardView}
                onClick={() => setIsCardView(false)}
              />
            </ButtonGroup>
          </Col>
        </Row>
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
        {invalidGeoPerimeters && invalidGeoPerimeters.length > 0 && (
          <Alert
            description={`Il y a ${displayCount(
              invalidGeoPerimeters.length,
              'périmètre',
              false
            )} qui ${
              invalidGeoPerimeters.length === 1
                ? "n'est pas valide"
                : 'ne sont pas valides'
            } car le nom du filtre n'est pas renseigné`}
            type="warning"
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
                        setGeoPerimetersToRemove([geoPerimeter])
                      }
                    />
                  </Col>
                ))}
              </Row>
            ) : (
              <GeoPerimetersTable
                geoPerimeters={perimeters}
                onEdit={setGeoPerimeterToUpdate}
                onRemove={setGeoPerimetersToRemove}
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
