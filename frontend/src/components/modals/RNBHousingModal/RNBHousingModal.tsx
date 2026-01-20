import Alert from '@codegouvfr/react-dsfr/Alert';
import { skipToken } from '@reduxjs/toolkit/query';
import { toOccupancy, type DatafoncierHousing } from '@zerologementvacant/models';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';

import { createExtendedModal } from '~/components/modals/ConfirmationModal/ExtendedModal';
import HousingResult from '~/components/HousingResult/HousingResult';
import { type Housing } from '~/models/Housing';
import { useFindHousingByRnbIdQuery } from '~/services/rnb.service';
import { useCreateHousingMutation } from '~/services/housing.service';
import { housingApi } from '~/services/housing.service';

export interface RNBHousingModalProps {
  rnbId: string | null;
  onClose(): void;
  onHousingCreated(housing: Housing): void;
}

function createRNBHousingModal() {
  const modal = createExtendedModal({
    id: 'rnb-housing-modal',
    isOpenedByDefault: false
  });

  return {
    ...modal,
    Component(props: RNBHousingModalProps) {
      // Use the non-lazy query with skipToken - it will automatically refetch when rnbId changes
      const { data: housings, isLoading, error, isFetching } =
        useFindHousingByRnbIdQuery(props.rnbId ?? skipToken);
      const [createHousing, createHousingMutation] = useCreateHousingMutation();
      const [getExistingHousing] = housingApi.useLazyGetHousingQuery();
      const [selectedHousing, setSelectedHousing] =
        useState<DatafoncierHousing | null>(null);
      const [existingError, setExistingError] = useState<string | null>(null);
      const [createError, setCreateError] = useState<string | null>(null);

      // Reset selected housing when rnbId changes
      useEffect(() => {
        setSelectedHousing(null);
        setExistingError(null);
        setCreateError(null);
      }, [props.rnbId]);

      function handleClose() {
        setSelectedHousing(null);
        setExistingError(null);
        setCreateError(null);
        props.onClose();
      }

      async function handleSelect(housing: DatafoncierHousing) {
        setExistingError(null);
        // Check if housing already exists
        try {
          const existing = await getExistingHousing(housing.idlocal).unwrap();
          if (existing) {
            setExistingError(
              `Ce logement existe déjà dans votre parc (${housing.idlocal})`
            );
            return;
          }
        } catch {
          // Housing doesn't exist, we can proceed
        }
        setSelectedHousing(housing);
      }

      async function handleConfirm() {
        if (selectedHousing) {
          setCreateError(null);
          try {
            const housing = await createHousing({
              localId: selectedHousing.idlocal
            }).unwrap();
            props.onHousingCreated(housing);
            handleClose();
          } catch (err: any) {
            console.error('Failed to create housing:', err);
            let errorMessage = 'Une erreur est survenue lors de la création du logement.';
            if (err?.data?.name === 'HousingMissingError') {
              errorMessage = `Ce logement (commune ${selectedHousing.idcom}) n'est pas dans le périmètre de votre établissement.`;
            } else if (err?.data?.message) {
              errorMessage = err.data.message;
            }
            setCreateError(errorMessage);
          }
        }
      }

      function toAddress(housing: DatafoncierHousing): string {
        const streetNumber = housing.dnvoiri.replace(/^0+/, '');
        const repetition = housing.dindic ?? '';
        const street = housing.dvoilib;
        const zipcode = housing.idcom;
        const city = housing.idcomtxt;
        return `${streetNumber}${repetition} ${street}, ${zipcode} ${city}`;
      }

      const hasHousings = housings && housings.length > 0;
      const showList = hasHousings && !selectedHousing && !isFetching;
      const showConfirm = selectedHousing !== null && !isFetching;

      return (
        <modal.Component
          title={
            showConfirm
              ? 'Confirmer l\'ajout du logement'
              : 'Logements trouvés dans ce bâtiment'
          }
          size="large"
          buttons={
            showConfirm
              ? [
                  {
                    children: 'Retour',
                    priority: 'secondary',
                    doClosesModal: false,
                    onClick: () => setSelectedHousing(null)
                  },
                  {
                    children: 'Confirmer l\'ajout',
                    doClosesModal: false,
                    disabled: createHousingMutation.isLoading,
                    onClick: handleConfirm
                  }
                ]
              : [
                  {
                    children: 'Fermer',
                    priority: 'secondary',
                    doClosesModal: false,
                    onClick: handleClose
                  }
                ]
          }
          onClose={handleClose}
        >
          {(isLoading || isFetching) && (
            <Typography>Recherche des logements en cours...</Typography>
          )}

          {error && (
            <Alert
              severity="info"
              title="Aucun logement"
              description={`Aucun logement n'a été trouvé pour ce bâtiment RNB (${props.rnbId}) dans les Fichiers Fonciers.`}
            />
          )}

          {existingError && (
            <Alert
              className="fr-mb-2w"
              severity="warning"
              title="Logement déjà existant"
              description={existingError}
            />
          )}

          {createError && (
            <Alert
              className="fr-mb-2w"
              severity="error"
              title="Erreur"
              description={createError}
            />
          )}

          {showList && (
            <>
              <Typography variant="subtitle2" sx={{ mb: '1rem' }}>
                {housings.length} logement{housings.length > 1 ? 's' : ''}{' '}
                trouvé{housings.length > 1 ? 's' : ''} dans ce bâtiment RNB.
                Cliquez sur un logement pour l'ajouter à votre parc.
              </Typography>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {housings.map((housing) => (
                  <div
                    key={housing.idlocal}
                    style={{
                      padding: '1rem',
                      marginBottom: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onClick={() => handleSelect(housing)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f5f5f5';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '';
                    }}
                  >
                    <HousingResult
                      address={toAddress(housing)}
                      display="two-lines"
                      localId={housing.idlocal}
                      apartment={null}
                      floor={null}
                      occupancy={toOccupancy(housing.ccthp)}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {showConfirm && (
            <>
              <Typography variant="subtitle2" sx={{ mb: '1.5rem' }}>
                Vous êtes sur le point d'ajouter ce logement à votre parc de
                suivi.
              </Typography>
              <HousingResult
                address={toAddress(selectedHousing)}
                display="two-lines"
                localId={selectedHousing.idlocal}
                apartment={null}
                floor={null}
                occupancy={toOccupancy(selectedHousing.ccthp)}
              />
            </>
          )}

          {!isLoading && !isFetching && !error && !hasHousings && props.rnbId && (
            <Alert
              severity="info"
              title="Aucun logement"
              description="Aucun logement n'a été trouvé pour ce bâtiment dans les Fichiers Fonciers."
            />
          )}
        </modal.Component>
      );
    }
  };
}

export default createRNBHousingModal;
