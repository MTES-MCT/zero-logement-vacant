import React, { ChangeEvent, useEffect, useState } from 'react';
import { Button, Col, Link, Row, Text, TextInput } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import {
  changeCampaignHousingPagination,
  listCampaignBundleHousing,
  removeCampaignHousingList,
  validCampaignStep,
} from '../../store/actions/campaignAction';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { CampaignSteps } from '../../models/Campaign';
import { format, isDate, parse } from 'date-fns';
import * as yup from 'yup';
import {
  TrackEventActions,
  TrackEventCategories
} from '../../models/TrackEvent';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import ButtonLink from "../../components/ButtonLink/ButtonLink";
import VerticalStepper from "../../components/VerticalStepper/VerticalStepper";
import VerticalStep from "../../components/VerticalStepper/VerticalStep";
import { useStepper } from "../../hooks/useStepper";
import { useForm } from "../../hooks/useForm";
import HousingList, {
  HousingDisplayKey
} from "../../components/HousingList/HousingList";
import HousingListHeaderActions
  from "../../components/HousingList/HousingListHeaderActions";
import HousingListHeader from "../../components/HousingList/HousingListHeader";
import AppSearchBar from "../../components/AppSearchBar/AppSearchBar";
import { useSelection } from "../../hooks/useSelection";
import ConfirmationModal
  from "../../components/modals/ConfirmationModal/ConfirmationModal";
import Help from "../../components/Help/Help";
import { useCampaignHousingSearch } from "../../hooks/useCampaignHousingSearch";
import { prependIf } from "../../utils/stringUtils";

interface CampaignToValidateProps {
    campaignStep: CampaignSteps
}

function CampaignToValidate({campaignStep}: CampaignToValidateProps) {

    const dispatch = useDispatch();
    const { trackEvent } = useMatomo();

    const { campaignBundle, campaignBundleHousing, campaignList } = useSelector((state: ApplicationState) => state.campaign);
    const campaign = campaignList?.find(_ => _.id === campaignBundle?.campaignIds[0])

  const [removing, setRemoving] = useState<string>();
    const [isRemovingModalOpen, setIsRemovingModalOpen] = useState<boolean>(false);

    const { forceStep, index, isCompleted, next } = useStepper([
      CampaignSteps.OwnersValidation,
      CampaignSteps.Export,
      CampaignSteps.Sending,
      CampaignSteps.Confirmation
    ], {
        step: campaignStep
    })

    const [sendingDate, setSendingDate] = useState(format(campaign?.sendingDate ?? new Date(), 'yyyy-MM-dd'));
    const sendingForm = yup.object().shape({
        sendingDate: yup
            .date()
            .transform((curr, originalValue) => {
                if (!originalValue.length)
                  return null
                if (isDate(originalValue))
                  return originalValue
                return parse(originalValue, 'yyyy-MM-dd', new Date())
            })
            .typeError('Veuillez renseigner une date valide.')
    });
    const { isValid, message, messageType } = useForm(sendingForm, { sendingDate })

    const { hasSelected, setSelected } = useSelection()

    const { search } = useCampaignHousingSearch()

    useEffect(() => {
        if (campaignBundle) {
            dispatch(listCampaignBundleHousing(campaignBundle))
        }
    }, [dispatch, campaignBundle])

    if (!campaignBundle) {
        return <></>
    }

    function editHousings() {
      forceStep(CampaignSteps.OwnersValidation)
    }

    const validStep = (step: CampaignSteps) => {
        trackEvent({
            category: TrackEventCategories.Campaigns,
            action: TrackEventActions.Campaigns.ValidStep(step)
        })
        if (step === CampaignSteps.Sending && isValid()) {
            dispatch(validCampaignStep(campaignBundle.campaignIds[0], step, {sendingDate : sendingDate.length ? parse(sendingDate, 'yyyy-MM-dd', new Date()) : undefined}))
            next()
        } else {
            dispatch(validCampaignStep(campaignBundle.campaignIds[0], step))
            next()
        }
    }

    function remove(id: string): void {
      setRemoving(id)
      setIsRemovingModalOpen(true)
    }

    const submitCampaignHousingRemove = () => {
        if (removing) {
          dispatch(removeCampaignHousingList(campaignBundle.campaignIds[0], false, [removing]))
          setIsRemovingModalOpen(false);
        }
    }

    async function downloadCSV(downloadOnly = false): Promise<void> {
      window.open(campaignBundle?.exportURL, '_self')
      if (!downloadOnly) {
        validStep(CampaignSteps.Export)
      }
    }

    const prependBravo = (condition: boolean) => prependIf(condition)('Bravo ! ')

    return (
      <>
        {!isCompleted(CampaignSteps.Export) &&
          <Help>
            Vous avez basculé dans l’onglet <b>“logements suivis”</b>, ici vous
            pouvez paramètrer votre campagne et y faire le suivi.
          </Help>
        }
        <VerticalStepper step={index}>
          <VerticalStep
            completed={isCompleted(CampaignSteps.OwnersValidation)}
            title={isCompleted(CampaignSteps.OwnersValidation)
              ? prependBravo(!isCompleted(CampaignSteps.Export))("Vous avez créé votre échantillon de campagne.")
              : "Modification de la liste de logements de l'échantillon."
            }
            content={isCompleted(CampaignSteps.OwnersValidation)
              ? <ButtonLink display="flex" isSimple onClick={editHousings}>Voir ou supprimer des logements</ButtonLink>
              : (
                <>
                  <Text size="lg">Supprimer des logements de votre campagne.</Text>
                  <HousingList
                    actions={housing => (
                      <ButtonLink
                        isSimple
                        onClick={() => remove(housing.id)}
                      >
                        Supprimer
                      </ButtonLink>
                    )}
                    displayKind={HousingDisplayKey.Housing}
                    onChangePagination={(page, perPage) => dispatch(changeCampaignHousingPagination(page, perPage))}
                    onSelectHousing={setSelected}
                    paginatedHousing={campaignBundleHousing}
                  >
                    <HousingListHeader>
                      <HousingListHeaderActions>
                        <Row>
                          {!hasSelected &&
                            <Col n="6">
                              <AppSearchBar onSearch={(q) => search(campaignBundle)(q)} />
                            </Col>
                          }
                        </Row>
                      </HousingListHeaderActions>
                    </HousingListHeader>
                  </HousingList>
                  <Row justifyContent="right">
                    <Button onClick={() => validStep(CampaignSteps.OwnersValidation)}>Valider</Button>
                  </Row>
                  {isRemovingModalOpen &&
                    <ConfirmationModal
                      onSubmit={() => submitCampaignHousingRemove()}
                      onClose={() => setIsRemovingModalOpen(false)}>
                      Êtes-vous sûr de vouloir supprimer ce logement de la campagne ?
                    </ConfirmationModal>
                  }
                </>
              )
            }
          />

          <VerticalStep
            completed={isCompleted(CampaignSteps.Export)}
            disabled={!isCompleted(CampaignSteps.OwnersValidation)}
            title={isCompleted(CampaignSteps.Export)
              ? prependBravo(!isCompleted(CampaignSteps.Sending))('Vous avez exporté la liste de logements.')
              : "Export du fichier de publipostage"
            }
            content={
              <Text>
                Exportez la liste des logements et des coordonnées
                propriétaires.<br />
                Découvrez <Link href="https://airtable.com/shrs2VFNm19BDMiVO/tblxKoKN1XGk0tM3R" isSimple target="_blank">nos exemples de courrier postal ici.</Link>
              </Text>
            }
            actions={isCompleted(CampaignSteps.Export)
              ? <Button secondary onClick={() => downloadCSV(true)}>Exporter à nouveau (.csv)</Button>
              : <Button onClick={() => downloadCSV()}>Exporter (.csv)</Button>
            }
          />

          <VerticalStep
            completed={isCompleted(CampaignSteps.Sending)}
            disabled={!isCompleted(CampaignSteps.Export)}
            title={isCompleted(CampaignSteps.Sending)
              ? prependBravo(!isCompleted(CampaignSteps.Confirmation))('Vous avez envoyé la campagne.')
              : 'Envoi de la campagne'
            }
            content="Datez l'envoi qui marque le début de votre campagne."
            actions={isCompleted(CampaignSteps.Sending)
              ? (
                <Row alignItems={isValid() ? 'bottom' : 'middle'} gutters>
                  <Col n="3">
                    <TextInput
                      value={sendingDate}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setSendingDate(e.target.value)}
                      label="Date d'envoi"
                      messageType={messageType('sendingDate')}
                      message={message('sendingDate')}
                      readOnly
                      type="date"
                    />
                  </Col>
                </Row>
              )
              : (
                <Row alignItems={isValid() ? 'bottom' : 'middle'} gutters>
                  <Col n="3">
                    <TextInput
                      value={sendingDate}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setSendingDate(e.target.value)}
                      label="Date d'envoi"
                      messageType={messageType('sendingDate')}
                      message={message('sendingDate')}
                      type="date"
                    />
                  </Col>
                  <Col>
                    <Button onClick={() => validStep(CampaignSteps.Sending)} disabled={!isValid()}>
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
              <Button onClick={() => validStep(CampaignSteps.Confirmation)}>Accéder au suivi</Button>
            }
          />
        </VerticalStepper>
      </>
    )
}

export default CampaignToValidate;

