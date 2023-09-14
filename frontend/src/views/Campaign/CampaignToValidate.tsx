import React, { ChangeEvent, useEffect, useState } from 'react';
import { Button, Col, Link, Row, Text } from '@dataesr/react-dsfr';
import {
  removeCampaignHousingList,
  validCampaignStep,
} from '../../store/actions/campaignAction';
import { CampaignSteps } from '../../models/Campaign';
import { format } from 'date-fns';
import * as yup from 'yup';
import {
  TrackEventActions,
  TrackEventCategories,
} from '../../models/TrackEvent';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import ButtonLink from '../../components/ButtonLink/ButtonLink';
import VerticalStepper from '../../components/VerticalStepper/VerticalStepper';
import VerticalStep from '../../components/VerticalStepper/VerticalStep';
import { useStepper } from '../../hooks/useStepper';
import { dateValidator, useForm } from '../../hooks/useForm';
import HousingList, {
  HousingDisplayKey,
} from '../../components/HousingList/HousingList';
import SelectableListHeaderActions from '../../components/SelectableListHeader/SelectableListHeaderActions';
import SelectableListHeader from '../../components/SelectableListHeader/SelectableListHeader';
import { useSelection } from '../../hooks/useSelection';
import ConfirmationModal from '../../components/modals/ConfirmationModal/ConfirmationModal';
import Help from '../../components/Help/Help';
import { pluralize, prependIf } from '../../utils/stringUtils';
import { parseDateInput } from '../../utils/dateUtils';
import { useAppDispatch, useAppSelector } from '../../hooks/useStore';
import AppTextInput from '../../components/AppTextInput/AppTextInput';
import { useHousingList } from '../../hooks/useHousingList';
import housingSlice from '../../store/reducers/housingReducer';
import AppSearchBar from '../../components/AppSearchBar/AppSearchBar';

interface CampaignToValidateProps {
  campaignStep: CampaignSteps;
}

function CampaignToValidate({ campaignStep }: CampaignToValidateProps) {
  const dispatch = useAppDispatch();
  const { trackEvent } = useMatomo();

  const [query, setQuery] = useState<string>();
  const { campaignBundle, campaignList } = useAppSelector(
    (state) => state.campaign
  );
  const campaign = campaignList?.find(
    (_) => _.id === campaignBundle?.campaignIds[0]
  );

  const { totalCount, paginatedHousing, refetchPaginatedHousing } =
    useHousingList(
      {
        filters: { campaignIds: campaignBundle?.campaignIds, query },
      },
      { skip: !campaignBundle }
    );

  const [removingId, setRemovingId] = useState<string>();
  const [isRemovingModalOpen, setIsRemovingModalOpen] =
    useState<boolean>(false);

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

  const { hasSelected, setSelected, selected, selectedCount } =
    useSelection(totalCount);

  useEffect(() => {
    refetchPaginatedHousing();
  }, [campaignBundle]);

  if (!campaignBundle) {
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
    if (step === CampaignSteps.Sending) {
      await sendingForm.validate(() =>
        dispatch(
          validCampaignStep(campaignBundle.campaignIds[0], step, {
            sendingDate: parseDateInput(sendingDate),
          })
        )
      );
      next();
    } else {
      dispatch(validCampaignStep(campaignBundle.campaignIds[0], step));
      next();
    }
  };

  function remove(id: string): void {
    setRemovingId(id);
    setIsRemovingModalOpen(true);
  }

  const submitCampaignHousingRemove = () => {
    dispatch(
      removeCampaignHousingList(
        campaignBundle.campaignIds[0],
        removingId ? false : selected.all,
        removingId ? [removingId] : selected.ids,
        { query }
      )
    );
    setIsRemovingModalOpen(false);
  };

  const { changePagination } = housingSlice.actions;

  async function downloadCSV(downloadOnly = false): Promise<void> {
    window.open(campaignBundle?.exportURL, '_self');
    if (!downloadOnly) {
      await validStep(CampaignSteps.Export);
    }
  }

  const prependBravo = (condition: boolean) => prependIf(condition)('Bravo ! ');

  return (
    <>
      {!isCompleted(CampaignSteps.Export) && (
        <Help>
          Vous avez basculé dans l’onglet <b>“Campagnes”</b>, ici vous pouvez
          paramètrer votre campagne et y faire le suivi.
        </Help>
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
              <ButtonLink display="flex" isSimple onClick={editHousings}>
                Voir ou supprimer des logements
              </ButtonLink>
            ) : (
              <>
                <Text size="lg">
                  Supprimer des logements de votre campagne.
                </Text>
                <HousingList
                  actions={(housing) => (
                    <ButtonLink isSimple onClick={() => remove(housing.id)}>
                      Supprimer
                    </ButtonLink>
                  )}
                  displayKind={HousingDisplayKey.Housing}
                  onChangePagination={(page, perPage) =>
                    dispatch(changePagination({ page, perPage }))
                  }
                  onSelectHousing={setSelected}
                  paginatedHousing={paginatedHousing}
                >
                  <SelectableListHeader entity="logement">
                    <SelectableListHeaderActions>
                      <Row justifyContent="right">
                        {!hasSelected ? (
                          <Col n="6">
                            <AppSearchBar onSearch={(q) => setQuery(q)} />
                          </Col>
                        ) : (
                          <Button
                            title="Supprimer"
                            onClick={() => setIsRemovingModalOpen(true)}
                          >
                            Supprimer
                          </Button>
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
                {isRemovingModalOpen && (
                  <ConfirmationModal
                    onSubmit={() => submitCampaignHousingRemove()}
                    onClose={() => {
                      setIsRemovingModalOpen(false);
                      setRemovingId(undefined);
                    }}
                  >
                    Êtes-vous sûr de vouloir supprimer 
                    {pluralize(removingId ? 1 : selectedCount)('ce logement')}
                    de la campagne ?
                  </ConfirmationModal>
                )}
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
              <Link
                href="https://airtable.com/shrs2VFNm19BDMiVO/tblxKoKN1XGk0tM3R"
                isSimple
                target="_blank"
              >
                nos exemples de courrier postal ici.
              </Link>
            </Text>
          }
          actions={
            isCompleted(CampaignSteps.Export) ? (
              <Button secondary onClick={() => downloadCSV(true)}>
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
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setSendingDate(e.target.value)
                    }
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
