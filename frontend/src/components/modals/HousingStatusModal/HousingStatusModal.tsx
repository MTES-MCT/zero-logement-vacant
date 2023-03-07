import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
  Container,
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalTitle,
  Select,
} from '@dataesr/react-dsfr';
import { Housing, HousingUpdate } from '../../../models/Housing';
import { DefaultOption } from '../../../models/SelectOption';
import HousingStatusForm from './HousingStatusForm';
import { useCampaignList } from '../../../hooks/useCampaignList';
import { useAppDispatch } from '../../../hooks/useStore';

const HousingStatusModal = ({
  housingList,
  onSubmit,
  onClose,
}: {
  housingList: Housing[];
  onSubmit: (housing: Housing, housingUpdate: HousingUpdate) => void;
  onClose: () => void;
}) => {
  const dispatch = useAppDispatch();
  const campaignList = useCampaignList();
  const statusFormRef = useRef<{ validate: () => void }>();

  const [housing, setHousing] = useState<Housing>();

  useEffect(() => {
    if (housingList.length === 1) {
      selectHousing(housingList[0].id);
    }
  }, [dispatch]); //eslint-disable-line react-hooks/exhaustive-deps

  const housingOptions =
    housingList.length === 1
      ? [
          {
            value: housingList[0].id,
            label: housingList[0].rawAddress.join(' - '),
          },
        ]
      : [
          DefaultOption,
          ...housingList.map((housing, index) => ({
            value: housing.id,
            label: [`Logement ${index + 1}`, ...housing.rawAddress].join(' - '),
          })),
        ];

  const selectHousing = (housingId: string) => {
    setHousing(housingList.find((_) => _.id === housingId));
  };

  const submit = (housingUpdate: HousingUpdate) => {
    if (housing) {
      onSubmit(housing, housingUpdate);
    }
  };

  const hasCampaign = housing && housing.campaignIds.length > 0;

  const hasOnlyDefaultCampaign =
    housing &&
    housing.campaignIds.length === 1 &&
    campaignList?.find((_) => _.id === housing.campaignIds[0])
      ?.campaignNumber === 0;

  return (
    <Modal isOpen={true} hide={() => onClose()} size="lg">
      <ModalClose hide={() => onClose()} title="Fermer la fenêtre">
        Fermer
      </ModalClose>
      <ModalTitle>
        <span className="ri-1x icon-left ri-arrow-right-line ds-fr--v-middle" />
        Mettre à jour le dossier
      </ModalTitle>
      <ModalContent>
        <Container as="section" fluid>
          {housingOptions && (
            <Select
              label="Logement concerné"
              options={housingOptions}
              selected={housing?.id}
              onChange={(e: any) => selectHousing(e.target.value)}
            />
          )}
          {housing && !hasCampaign && (
            <div className="fr-pb-2w">
              <b>
                Ce logement n’est pas présent dans la liste des logements suivis
                actuellement
              </b>
            </div>
          )}
          {housing && (
            <HousingStatusForm
              currentStatus={housing.status}
              currentSubStatus={housing.subStatus}
              currentPrecisions={housing.precisions}
              currentVacancyReasons={housing.vacancyReasons}
              fromDefaultCampaign={hasOnlyDefaultCampaign}
              onValidate={submit}
              ref={statusFormRef}
            />
          )}
        </Container>
      </ModalContent>
      <ModalFooter>
        <Button
          title="Annuler"
          secondary
          className="fr-mr-2w"
          onClick={() => onClose()}
        >
          Annuler
        </Button>
        {
          <Button
            title="Enregistrer"
            onClick={() => statusFormRef.current?.validate()}
          >
            Enregistrer
          </Button>
        }
      </ModalFooter>
    </Modal>
  );
};

export default HousingStatusModal;
