import React, { ChangeEvent, useEffect, useState } from 'react';
import { Alert, Button, Col, Row, Stepper, Text, TextInput, Title } from '@dataesr/react-dsfr';
import styles from '../../views/Campaign/campaign.module.scss';
import { useHistory } from 'react-router-dom';
import {
    CampaignBundle,
    CampaignBundleId,
    campaignBundleIdUrlFragment,
    CampaignNumberSort,
    campaignPartialName,
    campaignReminderName,
    campaignStep,
    CampaignSteps,
    returnRate,
} from '../../models/Campaign';
import { useCampaignList } from '../../hooks/useCampaignList';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { TrackEventActions, TrackEventCategories } from '../../models/TrackEvent';
import { deleteCampaignBundle, listCampaignBundles, validCampaignStep } from '../../store/actions/campaignAction';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import ConfirmationModal from '../modals/ConfirmationModal/ConfirmationModal';
import { format, parse } from 'date-fns';
import { fr } from 'date-fns/locale';
import AppCard from '../AppCard/AppCard';
import CampaignExportModal from '../modals/CampaignExportModal/CampaignExportModal';
import * as yup from 'yup';
import { dateValidator, useForm } from '../../hooks/useForm';
import Help from '../Help/Help';

interface Props {
    withDeletion?: boolean
}

const CampaignBundleList = (
    {
        withDeletion = false
    }: Props) => {

    const dispatch = useDispatch();
    const { trackEvent } = useMatomo();
    const history = useHistory();
    const campaignList = useCampaignList(true);

    const { loading, campaignBundleList } = useSelector((state: ApplicationState) => state.campaign);
    const [deletionModalCampaignBundleId, setDeletionModalCampaignBundleId] = useState<CampaignBundleId | undefined>();
    const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
    const [sendingDate, setSendingDate] = useState(format(new Date(), 'dd/MM/yyyy'));

    useEffect(() => {
        dispatch(listCampaignBundles())
    }, [dispatch]);

    const campaignsOfBundle = (campaignBundle: CampaignBundle) => {
        return campaignList?.filter(_ => campaignBundle.campaignIds.indexOf(_.id) !== -1) ?? []
    }

    const schema = yup.object().shape({sendingDate: dateValidator})

    const { isValid, message, messageType, validate } = useForm(schema, { sendingDate })

    const onSendingCampaign = (campaignId: string) => {
        validate().then(() => {
            if (isValid()) {
                trackEvent({
                    category: TrackEventCategories.Campaigns,
                    action: TrackEventActions.Campaigns.ValidStep(CampaignSteps.Sending)
                })
                dispatch(validCampaignStep(campaignId, CampaignSteps.Sending, {sendingDate : parse(sendingDate, 'dd/MM/yyyy', new Date())}))
            }
        })
    }

    const onDeleteCampaign = () => {
        if (deletionModalCampaignBundleId?.campaignNumber) {
            trackEvent({
                category: TrackEventCategories.Campaigns,
                action: TrackEventActions.Campaigns.Delete
            })
            dispatch(deleteCampaignBundle(deletionModalCampaignBundleId))
        }
        setDeletionModalCampaignBundleId(undefined);
    }

    if (loading) {
        return <></>
    }

    return (
        <>
            {campaignBundleList && !campaignBundleList.length &&
                <Text>Il n&acute;y a pas de campagne en cours.</Text>
            }
            {campaignBundleList && campaignBundleList.sort(CampaignNumberSort).map(campaignBundle =>
                <div key={`CampaignBundle_${campaignBundle.campaignIds.join('-')}`} className={styles.campaignCard}>
                    <Row gutters alignItems="top" className="fr-pb-3w">
                        <Col>
                            <Title as="h2" look="h3" className="fr-mb-0">
                                {campaignPartialName(campaignBundle.campaignNumber)} - {campaignBundle.title}
                            </Title>
                            {(campaignBundle.campaignNumber ?? 0) > 0 ?
                                <Text size="small" className="subtitle">
                                    échantillon crée le <b>{format(campaignBundle.createdAt, 'dd/MM/yy', { locale: fr })}</b>
                                </Text> :
                                <div className="fr-py-2w">
                                    <Help>
                                        Les logements hors campagne sont les logements qui sont <b>en cours de suivi mais qui ne sont pas compris dans une campagne.</b>
                                    </Help>
                                </div>
                            }
                            <div>
                                <AppCard icon="ri-home-fill" isGrey={true}>
                                    <Text as="span">
                                        <b>{campaignBundle.housingCount}</b> {campaignBundle.housingCount <= 1 ? 'logement' : 'logements'}
                                    </Text>
                                </AppCard>
                                <AppCard icon="ri-user-fill" isGrey={true}>
                                    <Text as="span">
                                        <b>{campaignBundle.ownerCount}</b> {campaignBundle.ownerCount <= 1 ? 'propriétaire' : 'propriétaires'}
                                    </Text>
                                </AppCard>
                            </div>
                        </Col>
                        {(campaignBundle.campaignNumber ?? 0) > 0 &&
                            <Col n="6">
                                {campaignsOfBundle(campaignBundle).length === 1 &&
                                    <>
                                        {campaignStep(campaignsOfBundle(campaignBundle)[0]) === CampaignSteps.Export &&
                                            <div className="fr-p-4w bg-bf975">
                                                <Stepper
                                                    steps={3}
                                                    currentStep={1}
                                                    nextStep={2}
                                                    currentTitle="Vous avez créé l'échantillon."
                                                    nextStepTitle="Exporter le fichier de publipostage"
                                                />
                                                <Button title="Exporter"
                                                        secondary
                                                        onClick={() => setIsExportModalOpen(true)}>
                                                    Exporter (.csv)
                                                </Button>
                                                {isExportModalOpen &&
                                                    <CampaignExportModal campaignBundle={campaignBundle}
                                                                         onClose={() => setIsExportModalOpen(false)}/>
                                                }
                                            </div>
                                        }
                                        {campaignStep(campaignsOfBundle(campaignBundle)[0]) === CampaignSteps.Sending &&
                                            <div className="fr-p-4w bg-bf975">
                                                <Stepper
                                                    steps={3}
                                                    currentStep={2}
                                                    nextStep={3}
                                                    currentTitle="Vous avez exporté l'échantillon."
                                                    nextStepTitle="Dater l'envoi de votre campagne"
                                                />
                                                <Row alignItems="top">
                                                    <Col className="fr-pr-1w">
                                                        <TextInput
                                                            value={sendingDate}
                                                            onChange={(e: ChangeEvent<HTMLInputElement>) => setSendingDate(e.target.value)}
                                                            label="Date d'envoi"
                                                            message={message('sendingDate')}
                                                            messageType={messageType('sendingDate')}
                                                        />
                                                    </Col>
                                                    <Col className="fr-pt-4w">
                                                        <Button title="Confirmer la date d'envoi"
                                                                secondary
                                                                onClick={() => onSendingCampaign(campaignBundle.campaignIds[0])}>
                                                            Confirmer la date d'envoi
                                                        </Button>
                                                    </Col>
                                                </Row>
                                            </div>
                                        }
                                        {campaignStep(campaignsOfBundle(campaignBundle)[0]) === CampaignSteps.InProgress &&
                                            <div className="fr-p-4w bg-bf975">
                                                <Title as="h3" look="h6">
                                                    Suivi en cours
                                                </Title>
                                                <AppCard icon="ri-feedback-fill">
                                                    <Text as="span">
                                                        <b>{returnRate(campaignBundle)}%</b> de retour
                                                    </Text>
                                                </AppCard>
                                            </div>
                                        }
                                    </>
                                }
                            </Col>
                        }
                    </Row>
                    {campaignsOfBundle(campaignBundle).length > 1 && campaignsOfBundle(campaignBundle).map((campaign, campaignIndex) =>
                        <div key={`Campaign_${campaign.id}`}>
                            <hr className="fr-pb-1w fr-mt-1w"/>
                            <Row gutters>
                                <Col n="9">
                                    {campaignReminderName(campaign.reminderNumber, campaign.kind)}
                                </Col>
                                <Col n="3" className="align-right">
                                    {campaignIndex === campaignsOfBundle(campaignBundle).length - 1 && withDeletion &&
                                        <Button title="Supprimer"
                                                tertiary
                                                onClick={() => setDeletionModalCampaignBundleId(campaign as CampaignBundleId)}
                                                className="fr-btn--tertiary-no-outline"
                                                icon="ri-delete-bin-5-fill"
                                        >
                                            Supprimer
                                        </Button>
                                    }
                                    <Button title="Accéder"
                                            tertiary
                                            onClick={() => history.push('/campagnes/' + campaignBundleIdUrlFragment({campaignNumber: campaign.campaignNumber, reminderNumber: campaign.reminderNumber}))}
                                            icon="ri-arrow-right-line"
                                            iconPosition="right"
                                            className="fr-btn--tertiary-no-outline"
                                    >
                                        Accéder
                                    </Button>
                                </Col>
                            </Row>
                        </div>
                    )}
                    <hr />
                    <Row>
                        <Col className="align-right">
                            {(campaignBundle.campaignNumber ?? 0) > 0 && withDeletion &&
                                <Button title="Supprimer"
                                        tertiary
                                        onClick={() => setDeletionModalCampaignBundleId(campaignBundle)}
                                        className="fr-btn--tertiary-no-outline"
                                        icon="ri-delete-bin-5-fill"
                                >
                                    Supprimer
                                </Button>
                            }
                            <Button title="Accéder"
                                    onClick={() => history.push('/campagnes/C' + campaignBundle.campaignNumber)}
                                    icon="ri-arrow-right-line"
                                    iconPosition="right"
                            >
                                Accéder
                            </Button>
                        </Col>
                    </Row>
                </div>
            )}
            {deletionModalCampaignBundleId && deletionModalCampaignBundleId.campaignNumber &&
                <ConfirmationModal
                    onSubmit={onDeleteCampaign}
                    onClose={() => setDeletionModalCampaignBundleId(undefined)}>
                    <Text size="md">
                        Êtes-vous sûr de vouloir supprimer cette {deletionModalCampaignBundleId.reminderNumber ? 'relance' : 'campagne'} ?
                    </Text>
                    {(!deletionModalCampaignBundleId.reminderNumber && deletionModalCampaignBundleId.campaignNumber < (campaignList ?? []).length) &&
                        <Alert description="Les campagnes suivantes seront renumérotées."
                               type="info"/>
                    }
                    <Alert description='Les statuts des logements "En attente de retour" repasseront en "Jamais contacté". Les autres statuts mis à jour ne seront pas modifiés.'
                           type="info"/>
                </ConfirmationModal>
            }
        </>
    );
};

export default CampaignBundleList;
