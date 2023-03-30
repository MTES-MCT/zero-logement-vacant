import React, { useRef } from 'react';
import { Button, Container } from '@dataesr/react-dsfr';
import { Housing, HousingUpdate } from '../../models/Housing';
import { useCampaignList } from '../../hooks/useCampaignList';
import Aside from '../Aside/Aside';
import { Campaign } from '../../models/Campaign';
import HousingEditionForm from './HousingEditionForm';

interface Props {
  housing: Housing | undefined;
  expand: boolean;
  onSubmit: (housing: Housing, housingUpdate: HousingUpdate) => void;
  onClose: () => void;
}

const HousingEditionSideMenu = ({
  housing,
  expand,
  onSubmit,
  onClose,
}: Props) => {
  const campaignList = useCampaignList();
  const statusFormRef = useRef<{ submit: () => void }>();
  const submit = (housingUpdate: HousingUpdate) => {
    if (housing) {
      onSubmit(housing, housingUpdate);
    }
  };

  const hasCampaign = housing && housing.campaignIds.length > 0;

  const hasOnlyDefaultCampaign =
    housing &&
    housing.campaignIds.length === 1 &&
    campaignList?.find((_: Campaign) => _.id === housing.campaignIds[0])
      ?.campaignNumber === 0;

  return (
    <Aside
      expand={expand}
      onClose={onClose}
      title={`Mise à jour du ${housing?.rawAddress.join(' - ')}`}
      content={
        <Container as="section" spacing="pl-1w">
          {housing && !hasCampaign && (
            <div className="fr-pb-2w">
              <b>
                Ce logement n’est pas présent dans la liste des logements suivis
                actuellement
              </b>
            </div>
          )}
          {housing && (
            <HousingEditionForm
              currentStatus={housing.status}
              currentSubStatus={housing.subStatus}
              currentPrecisions={housing.precisions}
              currentVacancyReasons={housing.vacancyReasons}
              fromDefaultCampaign={hasOnlyDefaultCampaign}
              onSubmit={submit}
              ref={statusFormRef}
            />
          )}
        </Container>
      }
      footer={
        <>
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
              onClick={() => statusFormRef.current?.submit()}
            >
              Enregistrer
            </Button>
          }
        </>
      }
    />
  );
};

export default HousingEditionSideMenu;
