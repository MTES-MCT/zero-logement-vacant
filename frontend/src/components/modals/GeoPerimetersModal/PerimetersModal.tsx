import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import ButtonsGroup from '@codegouvfr/react-dsfr/ButtonsGroup';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';

import { createConfirmationModal } from '~/components/modals/ConfirmationModal/ConfirmationModalNext';
import { type GeoPerimeter } from '../../../models/GeoPerimeter';
import {
  useDeleteGeoPerimetersMutation,
  useListGeoPerimetersQuery,
  useUpdateGeoPerimeterMutation,
  useUploadGeoPerimeterFileMutation
} from '../../../services/geo.service';
import { displayCount, pluralize } from '../../../utils/stringUtils';
import AppSearchBar from '../../_app/AppSearchBar/AppSearchBar';
import GeoPerimeterCard from '../../GeoPerimeterCard/GeoPerimeterCard';
import { createExtendedModal } from '../ConfirmationModal/ExtendedModal';
import createPerimeterEditionModal, {
  type PerimeterEditionPayload
} from '../GeoPerimeterEditionModal/GeoPerimeterEditionModal';
import createPerimeterUploadModal from '../GeoPerimeterUploadingModal/PerimeterUploadModal';
import GeoPerimetersTable from './GeoPerimetersTable';

const confirmationModal = createConfirmationModal({
  id: 'perimeter-confirmation-modal',
  isOpenedByDefault: false
});
const uploadModal = createPerimeterUploadModal();
const editionModal = createPerimeterEditionModal();

function createPerimetersModal() {
  const perimetersModal = createExtendedModal({
    id: 'geo-perimeters-modal',
    isOpenedByDefault: false
  });

  return {
    ...perimetersModal,
    Component() {
      const { data: geoPerimeters } = useListGeoPerimetersQuery();
      const [editing, setEditing] = useState<GeoPerimeter | null>(null);
      const [isCardView, setIsCardView] = useState<boolean>(false);

      const [
        uploadGeoPerimeterFile,
        { isSuccess: isUploadSuccess, isError: isUploadError }
      ] = useUploadGeoPerimeterFileMutation();
      async function upload(file: File): Promise<void> {
        await uploadGeoPerimeterFile(file)
          .unwrap()
          .finally(() => {
            uploadModal.close();
          });
      }

      function startEditing(perimeter: GeoPerimeter): void {
        setEditing(perimeter);
        editionModal.open();
      }

      const [
        updateGeoPerimeter,
        {
          isSuccess: isUpdateSuccess,
          originalArgs: updateArgs,
          isError: isUpdateError
        }
      ] = useUpdateGeoPerimeterMutation();

      async function edit(payload: PerimeterEditionPayload) {
        if (editing) {
          await updateGeoPerimeter({
            geoPerimeterId: editing.id,
            kind: payload.kind,
            name: payload.name
          })
            .unwrap()
            .finally(() => {
              setEditing(null);
              perimetersModal.open();
            });
        }
      }

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
                  perimeter.name.toLowerCase().search(query.toLowerCase()) !==
                    -1 ||
                  perimeter.kind.toLowerCase().search(query.toLowerCase()) !==
                    -1
              )
            : geoPerimeters,
        [query, geoPerimeters]
      );

      const invalidGeoPerimeters = useMemo<GeoPerimeter[] | undefined>(
        () => perimeters?.filter((_) => !_.kind?.length),
        [perimeters]
      );

      const [confirming, setConfirming] = useState<ReadonlyArray<GeoPerimeter>>(
        []
      );

      function confirmRemoval(perimeters: ReadonlyArray<GeoPerimeter>): void {
        setConfirming(perimeters);
        confirmationModal.open();
      }

      const [
        deleteGeoPerimeters,
        { isSuccess: isDeleteSuccess, isError: isDeleteError }
      ] = useDeleteGeoPerimetersMutation();

      async function removePerimeters(
        perimeters: ReadonlyArray<GeoPerimeter>
      ): Promise<void> {
        await deleteGeoPerimeters(
          perimeters.map((perimeter) => perimeter.id)
        ).unwrap();
        setConfirming([]);
        confirmationModal.close();
        perimetersModal.open();
      }

      return (
        <>
          <confirmationModal.Component
            title={
              confirming.length > 1
                ? `Suppression de ${confirming.length} périmètres`
                : 'Suppression du périmètre'
            }
            onClose={() => {
              setConfirming([]);
              perimetersModal.open();
            }}
            onSubmit={() => removePerimeters(confirming)}
          >
            <Typography>
              Êtes-vous sûr de vouloir supprimer{' '}
              {pluralize(confirming.length)('ce périmètre')} ?
            </Typography>
          </confirmationModal.Component>

          <uploadModal.Component
            onClose={() => {
              perimetersModal.open();
            }}
            onSubmit={upload}
          />

          <editionModal.Component
            perimeter={editing}
            onClose={() => {
              perimetersModal.open();
              setConfirming([]);
            }}
            onSubmit={edit}
          />

          <perimetersModal.Component
            title={`Vos périmètres géographiques (${geoPerimeters?.length ?? 0})`}
            size="extra-extra-large"
            buttons={[
              {
                children: 'Fermer',
                doClosesModal: true,
                onClick() {
                  perimetersModal.close();
                }
              }
            ]}
          >
            <Grid container>
              <Typography variant="subtitle2">
                Pour afficher un périmètre (OPAH, ORT, Permis de louer, etc.)
                dans les filtres du Parc de logements, vous devez déposer un
                fichier géographique contenant ce périmètre, puis renseigner le
                nom du filtre dans lequel vous souhaitez qu&apos;il apparaisse.
                Vous pouvez regrouper plusieurs périmètres dans un même filtre
                en leur attribuant le même nom de filtre.
              </Typography>
              <Grid
                container
                className="fr-mt-3w fr-mb-1w"
                columnSpacing={4}
                size={12}
                sx={{ justifyContent: 'space-between' }}
              >
                <Grid size="grow">
                  <Stack direction="row" spacing={2}>
                    <AppSearchBar
                      label="Rechercher un périmètre"
                      onSearch={search}
                      onKeySearch={searchAsync}
                    />
                    <Button
                      onClick={() => {
                        uploadModal.open();
                      }}
                      priority="secondary"
                    >
                      Déposer un périmètre
                    </Button>
                  </Stack>
                </Grid>
                <Grid size="auto">
                  <ButtonsGroup
                    alignment="right"
                    buttonsEquisized
                    inlineLayoutWhen="always"
                    buttons={[
                      {
                        title: 'Vue liste',
                        iconId: 'fr-icon-layout-grid-fill',
                        priority: isCardView ? 'secondary' : 'primary',
                        onClick: () => setIsCardView(true)
                      },
                      {
                        title: 'Vue bloc',
                        iconId: 'fr-icon-list-unordered',
                        priority: isCardView ? 'primary' : 'secondary',
                        onClick: () => setIsCardView(false)
                      }
                    ]}
                  />
                </Grid>
              </Grid>
              {isUploadSuccess && (
                <Alert
                  severity="success"
                  description="Le fichier a été déposé avec succès !"
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
                    { capitalize: false }
                  )} sans nom de filtre renseigné ${
                    invalidGeoPerimeters.length === 1
                      ? "il n'apparaît donc pas dans les filtres du Parc de logements. Pour l'afficher, renseignez le nom du filtre."
                      : 'ils n’apparaissent donc pas dans les filtres du Parc de logements. Pour les afficher, renseignez le nom des filtres.'
                  } Exemple : « OPAH »`}
                  severity="warning"
                  small
                  className="fr-mb-2w"
                />
              )}
              {perimeters && perimeters.length > 0 && (
                <>
                  {isCardView ? (
                    <Grid container size={12} spacing={2}>
                      {perimeters?.map((geoPerimeter) => (
                        <Grid size={{ xs: 12, md: 4 }} key={geoPerimeter.id}>
                          <GeoPerimeterCard
                            geoPerimeter={geoPerimeter}
                            onEdit={startEditing}
                            onRemove={(perimeter) =>
                              confirmRemoval([perimeter])
                            }
                          />
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <GeoPerimetersTable
                      perimeters={perimeters}
                      onEdit={startEditing}
                      onRemove={confirmRemoval}
                    />
                  )}
                </>
              )}
            </Grid>
          </perimetersModal.Component>
        </>
      );
    }
  };
}

export default createPerimetersModal;
