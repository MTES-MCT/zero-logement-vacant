import React, { useState } from 'react';
import { Col, Row, Text } from '../../components/_dsfr';
import { CampaignSteps } from '../../models/Campaign';
import { format } from 'date-fns';
import * as yup from 'yup';
import {
  TrackEventActions,
  TrackEventCategories,
} from '../../models/TrackEvent';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import AppLinkAsButton from '../../components/_app/AppLinkAsButton/AppLinkAsButton';
import VerticalStepper from '../../components/VerticalStepper/VerticalStepper';
import VerticalStep from '../../components/VerticalStepper/VerticalStep';
import { useStepper } from '../../hooks/useStepper';
import { dateValidator, useForm } from '../../hooks/useForm';
import HousingList from '../../components/HousingList/HousingList';
import SelectableListHeaderActions from '../../components/SelectableListHeader/SelectableListHeaderActions';
import SelectableListHeader from '../../components/SelectableListHeader/SelectableListHeader';
import { useSelection } from '../../hooks/useSelection';
import ConfirmationModal from '../../components/modals/ConfirmationModal/ConfirmationModal';
import { pluralize, prependIf } from '../../utils/stringUtils';
import { parseDateInput } from '../../utils/dateUtils';
import AppTextInput from '../../components/_app/AppTextInput/AppTextInput';
import AppSearchBar from '../../components/_app/AppSearchBar/AppSearchBar';
import { HousingFilters } from '../../models/HousingFilters';
import { useCountHousingQuery } from '../../services/housing.service';
import Button from '@codegouvfr/react-dsfr/Button';
import AppLink from '../../components/_app/AppLink/AppLink';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { useCampaign } from '../../hooks/useCampaign';
import { isDefined } from '../../utils/compareUtils';
import {
  useRemoveCampaignHousingMutation,
  useUpdateCampaignMutation,
} from '../../services/campaign.service';

interface CampaignToValidateProps {
  campaignStep: CampaignSteps;
}

function CampaignToValidate({ campaignStep }: CampaignToValidateProps) {
  const { trackEvent } = useMatomo();

  const [updateCampaignStep] = useUpdateCampaignMutation();
  const [removeCampaignHousing] = useRemoveCampaignHousingMutation();

  const [query, setQuery] = useState<string>();
  const { campaign } = useCampaign();

  const filters: HousingFilters = {
    campaignIds: [campaign?.id].filter(isDefined),
    query,
  };

  const { forceStep, index, isCompleted, next } = useStepper(
    [
      CampaignSteps.OwnersValidation,
      CampaignSteps.Export,
      CampaignSteps.Sending,
      CampaignSteps.Confirmation,
    ],
    {
      step: campaignStep,
    }
  );

  const [sendingDate, setSendingDate] = useState(
    format(campaign?.sendingDate ?? new Date(), 'yyyy-MM-dd')
  );

  const shape = { sendingDate: dateValidator };
  type FormShape = typeof shape;

  const sendingForm = useForm(yup.object().shape(shape), {
    sendingDate,
  });

  const { data: count } = useCountHousingQuery(filters);
  const filteredHousingCount = count?.housing ?? 0;

  const { hasSelected, setSelected, selected, selectedCount } =
    useSelection(filteredHousingCount);

  if (!campaign) {
    return <></>;
  }

  function editHousings() {
    forceStep(CampaignSteps.OwnersValidation);
  }

  const validStep = async (step: CampaignSteps) => {
    trackEvent({
      category: TrackEventCategories.Campaigns,
      action: TrackEventActions.Campaigns.ValidStep(step),
    });
    await sendingForm.validate(async () => {
      await updateCampaignStep({
        id: campaign.id,
        campaignUpdate: {
          stepUpdate: {
            step,
            sendingDate:
              step === CampaignSteps.Sending
                ? parseDateInput(sendingDate)
                : undefined,
          },
        },
      });
    });
    next();
  };

  const submitCampaignHousingRemove = async (removingId?: string) => {
    await removeCampaignHousing({
      campaignId: campaign.id,
      ids: removingId ? [removingId] : selected.ids,
      all: removingId ? false : selected.all,
      filters: { query },
    });
  };

  const downloadCSV = async (downloadOnly = false) => {
    window.open(campaign.exportURL, '_self');
    if (!downloadOnly) {
      await validStep(CampaignSteps.Export);
    }
  };

  const prependBravo = (condition: boolean) => prependIf(condition)('Bravo ! ');

  return (
    <>
      {!isCompleted(CampaignSteps.Export) && (
        <Alert
          closable
          severity="info"
          title="Bienvenue dans l’espace suivi de votre campagne !"
          description="Vous retrouverez ici tous les logements ciblés par cette campagne. Mettez-les à jour logement par logement ou par groupe de logements."
        />
      )}
      <VerticalStepper step={index}>
        <VerticalStep
          completed={isCompleted(CampaignSteps.OwnersValidation)}
          title={
            isCompleted(CampaignSteps.OwnersValidation)
              ? prependBravo(!isCompleted(CampaignSteps.Export))(
                  'Vous avez créé votre échantillon de campagne.'
                )
              : "Modification de la liste de logements de l'échantillon."
          }
          content={
            isCompleted(CampaignSteps.OwnersValidation) ? (
              <AppLinkAsButton isSimple onClick={editHousings}>
                Voir ou supprimer des logements
              </AppLinkAsButton>
            ) : (
              <>
                <Text size="lg">
                  Supprimer des logements de votre campagne.
                </Text>
                <HousingList
                  filters={filters}
                  actions={(housing) => (
                    <ConfirmationModal
                      modalId={housing.id}
                      onSubmit={() => submitCampaignHousingRemove(housing.id)}
                      openingAppLinkAsButtonProps={{
                        isSimple: true,
                        children: 'Supprimer',
                      }}
                    >
                      Êtes-vous sûr de vouloir supprimer ce logement de la
                      campagne ?
                    </ConfirmationModal>
                  )}
                  onSelectHousing={setSelected}
                >
                  <SelectableListHeader entity="logement">
                    <SelectableListHeaderActions>
                      <Row justifyContent="right">
                        {!hasSelected ? (
                          <Col n="6">
                            <AppSearchBar onSearch={(q) => setQuery(q)} />
                          </Col>
                        ) : (
                          <ConfirmationModal
                            modalId={campaign.id}
                            onSubmit={() => submitCampaignHousingRemove()}
                            openingButtonProps={{
                              children: 'Supprimer',
                            }}
                          >
                            Êtes-vous sûr de vouloir supprimer 
                            {pluralize(selectedCount)('ce logement')}  de la
                            campagne ?
                          </ConfirmationModal>
                        )}
                      </Row>
                    </SelectableListHeaderActions>
                  </SelectableListHeader>
                </HousingList>
                <Row justifyContent="right">
                  <Button
                    onClick={() => validStep(CampaignSteps.OwnersValidation)}
                  >
                    Valider
                  </Button>
                </Row>
              </>
            )
          }
        />

        <VerticalStep
          completed={isCompleted(CampaignSteps.Export)}
          disabled={!isCompleted(CampaignSteps.OwnersValidation)}
          title={
            isCompleted(CampaignSteps.Export)
              ? prependBravo(!isCompleted(CampaignSteps.Sending))(
                  'Vous avez exporté la liste de logements.'
                )
              : 'Export du fichier de publipostage'
          }
          content={
            <Text>
              Exportez la liste des logements et des coordonnées propriétaires.
              <br />
              Découvrez{' '}
              <AppLink
                to="https://airtable.com/shrs2VFNm19BDMiVO/tblxKoKN1XGk0tM3R"
                isSimple
                target="_blank"
              >
                nos exemples de courrier postal ici.
              </AppLink>
            </Text>
          }
          actions={
            isCompleted(CampaignSteps.Export) ? (
              <Button priority="secondary" onClick={() => downloadCSV(true)}>
                Exporter à nouveau (.csv)
              </Button>
            ) : (
              <Button onClick={() => downloadCSV()}>Exporter (.csv)</Button>
            )
          }
        />

        <VerticalStep
          completed={isCompleted(CampaignSteps.Sending)}
          disabled={!isCompleted(CampaignSteps.Export)}
          title={
            isCompleted(CampaignSteps.Sending)
              ? prependBravo(!isCompleted(CampaignSteps.Confirmation))(
                  'Vous avez envoyé la campagne.'
                )
              : 'Envoi de la campagne'
          }
          content="Datez l'envoi qui marque le début de votre campagne."
          actions={
            isCompleted(CampaignSteps.Sending) ? (
              <Row gutters>
                <Col n="3">
                  <AppTextInput<FormShape>
                    value={sendingDate}
                    label="Date d'envoi"
                    inputForm={sendingForm}
                    inputKey="sendingDate"
                    readOnly
                    type="date"
                  />
                </Col>
              </Row>
            ) : (
              <Row
                alignItems={
                  sendingForm.hasError('sendingDate') ? 'middle' : 'bottom'
                }
                gutters
              >
                <Col n="3">
                  <AppTextInput<FormShape>
                    value={sendingDate}
                    onChange={(e) => setSendingDate(e.target.value)}
                    label="Date d'envoi"
                    inputForm={sendingForm}
                    inputKey="sendingDate"
                    type="date"
                  />
                </Col>
                <Col>
                  <Button onClick={() => validStep(CampaignSteps.Sending)}>
                    Confirmer
                  </Button>
                </Col>
              </Row>
            )
          }
        />

        <VerticalStep
          completed={isCompleted(CampaignSteps.Confirmation)}
          disabled={!isCompleted(CampaignSteps.Sending)}
          title="Suivi de la campagne"
          content="Complétez et suivez toutes les interactions avec les propriétaires."
          actions={
            <Button onClick={() => validStep(CampaignSteps.Confirmation)}>
              Accéder au suivi
            </Button>
          }
        />
      </VerticalStepper>
    </>
  );
}

export default CampaignToValidate;
