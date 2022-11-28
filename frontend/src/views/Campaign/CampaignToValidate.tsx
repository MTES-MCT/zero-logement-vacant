import React, { ChangeEvent, useEffect, useState } from 'react';
import { Button, Col, Link, Row, Text, TextInput } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import {
  listCampaignBundleHousing,
  removeCampaignHousingList,
  validCampaignStep,
} from '../../store/actions/campaignAction';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { CampaignSteps } from '../../models/Campaign';
import { format, isDate, parse } from 'date-fns';
import * as yup from 'yup';
import { SelectedHousing } from '../../models/Housing';
import { MenuAction } from '../../components/AppActionsMenu/AppActionsMenu';
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

interface CampaignToValidateProps {
    campaignStep: CampaignSteps
}

function CampaignToValidate({campaignStep}: CampaignToValidateProps) {

    const dispatch = useDispatch();
    const { trackEvent } = useMatomo();

    const [selectedHousing, setSelectedHousing] = useState<SelectedHousing>({all: false, ids: []});
    const [isRemovingModalOpen, setIsRemovingModalOpen] = useState<boolean>(false);

    const { index, isCompleted, next } = useStepper([
      CampaignSteps.OwnersValidation,
      CampaignSteps.Export,
      CampaignSteps.Sending,
      CampaignSteps.Confirmation
    ], {
        step: campaignStep
    })

    const [sendingDate, setSendingDate] = useState(format(new Date(), 'yyyy-MM-dd'));
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

    const { campaignBundle, exportURL } = useSelector((state: ApplicationState) => state.campaign);

    useEffect(() => {
        if (campaignBundle) {
            dispatch(listCampaignBundleHousing(campaignBundle))
        }
    }, [dispatch, campaignBundle])

    if (!campaignBundle) {
        return <></>
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

    const submitCampaignHousingRemove = () => {
        dispatch(removeCampaignHousingList(campaignBundle.campaignIds[0], selectedHousing.all, selectedHousing.ids))
        setIsRemovingModalOpen(false);
    }

    const menuActions = [
        { title: 'Supprimer', selectedHousing, onClick: () => setIsRemovingModalOpen(true)}
    ] as MenuAction[]

    async function downloadCSV(downloadOnly = false): Promise<void> {
      // window.open(exportURL, '_self')
      if (!downloadOnly) {
        validStep(CampaignSteps.Export)
      }
    }

    return (
      <VerticalStepper step={index}>
          <VerticalStep
            completed={isCompleted(CampaignSteps.OwnersValidation)}
            title={isCompleted(CampaignSteps.OwnersValidation)
              ? "Bravo ! Vous avez créé votre échantillon de campagne."
              : "Modification de la liste de logements de l'échantillon."
            }
            content={isCompleted(CampaignSteps.OwnersValidation)
              ? <ButtonLink display="flex" isSimple>Voir ou supprimer des logements</ButtonLink>
              : null
            }
          />

          <VerticalStep
            completed={isCompleted(CampaignSteps.Export)}
            title={isCompleted(CampaignSteps.Export)
              ? "Bravo ! Vous avez exporté la liste de logements."
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
            title="Envoi de la campagne"
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
    )
}

export default CampaignToValidate;

