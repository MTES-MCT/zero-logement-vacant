import React, { ChangeEvent, useEffect, useState } from 'react';
import { Alert, Button, Col, Row, Stepper, Tag, TagGroup, Text, TextInput, Title } from '@dataesr/react-dsfr';
import styles from '../../views/Campaign/campaign.module.scss';
import { useHistory } from 'react-router-dom';
import {
    CampaignBundle,
    CampaignBundleId,
    campaignBundleIdUrlFragment,
    campaignFullName,
    CampaignNumberSort,
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

const CampaignBundleStats = ({ campaignBundle, isArchived }: { campaignBundle: CampaignBundle, isArchived: boolean }) => {

    return(
        <>
            <AppCard icon="ri-feedback-fill" isGrey={isArchived}>
                <Text as="span">
                    <b>{returnRate(campaignBundle)}%</b> de retour
                </Text>
            </AppCard>
            <AppCard icon="ri-phone-fill" isGrey={isArchived}>
                <Text as="span">
                    <b>{campaignBundle.neverContactedCount}</b> à recontacter
                </Text>
            </AppCard>
            <AppCard icon="ri-hand-coin-fill" isGrey={isArchived}>
                <Text as="span">
                    <b>{campaignBundle.inProgressWithSupportCount}</b> en accompagnement
                </Text>
            </AppCard>
        </>
    )
}

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
    const [archiveModalCampaignIds, setArchiveModalCampaignIds] = useState<string[]>([]);
    const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
    const [sendingDate, setSendingDate] = useState(format(new Date(), 'dd/MM/yyyy'));
    const [campaignInProgressFilter, setCampaignInProgressFilter] = useState<boolean>(true);
    const [campaignNoSentFilter, setCampaignNotSentFilter] = useState<boolean>(true);
    const [outsideCampaignFilter, setOutsideCampaignInProgressFilter] = useState<boolean>(true);
    const [campaignArchivedFilter, setCampaignArchivedFilter] = useState<boolean>(false);
    const [filteredCampaignBundles, setFilteredCampaignBundles] = useState<CampaignBundle[] | undefined>(campaignBundleList);

    useEffect(() => {
        dispatch(listCampaignBundles())
    }, [dispatch]);

    useEffect(() => {
        setFilteredCampaignBundles(
            campaignBundleList?.filter(campaignBundle =>
                (campaignInProgressFilter && stepFilter(CampaignSteps.InProgress)(campaignBundle)) ||
                (campaignNoSentFilter && (
                    stepFilter(CampaignSteps.OwnersValidation)(campaignBundle) ||
                    stepFilter(CampaignSteps.Export)(campaignBundle)
                )) ||
                (outsideCampaignFilter && stepFilter(CampaignSteps.Outside)(campaignBundle)) ||
                (campaignArchivedFilter && stepFilter(CampaignSteps.Archived)(campaignBundle))
            )
        )
    }, [campaignBundleList, campaignInProgressFilter, outsideCampaignFilter, campaignNoSentFilter, campaignArchivedFilter]);

    const stepFilter = (step: CampaignSteps) => (campaignBundle: CampaignBundle) => campaignBundleStep(campaignBundle) === step

    const campaignBundlesCount = (step: CampaignSteps) =>
        campaignBundleList?.filter(stepFilter(step)).length ?? 0

    const mainCampaignOfBundle = (campaignBundle: CampaignBundle) => {
        return (campaignList ?? []).filter(_ => campaignBundle.campaignIds.indexOf(_.id) !== -1)[0]
    }

    const reminderCampaignsOfBundle = (campaignBundle: CampaignBundle) => {
        return (campaignList ?? [])
            .filter(_ => campaignBundle.campaignIds.indexOf(_.id) !== -1)
            .filter(_ => _.reminderNumber > 0)
    }

    const campaignBundleStep  = (campaignBundle: CampaignBundle) => campaignStep(mainCampaignOfBundle(campaignBundle))

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

    const onArchiveCampaign = () => {
        archiveModalCampaignIds.forEach(campaignId => {
            trackEvent({
                category: TrackEventCategories.Campaigns,
                action: TrackEventActions.Campaigns.Archive
            })

            dispatch(validCampaignStep(campaignId, CampaignSteps.Archived))
        })
        setArchiveModalCampaignIds([]);
    }

    if (loading) {
        return <></>
    }

    return (
        <>
            <TagGroup className="fr-py-2w">
                <Tag as="span"
                     selected={campaignInProgressFilter}
                     onClick={() => setCampaignInProgressFilter(!campaignInProgressFilter)}>
                    Suivi en cours ({campaignBundlesCount(CampaignSteps.InProgress)})
                </Tag>
                <Tag as="span"
                     selected={campaignNoSentFilter}
                     onClick={() => setCampaignNotSentFilter(!campaignNoSentFilter)}>
                    Campagne en attente d'envoi ({campaignBundlesCount(CampaignSteps.OwnersValidation) + campaignBundlesCount(CampaignSteps.Export)})
                </Tag>
                <Tag as="span"
                     selected={campaignArchivedFilter}
                     onClick={() => setCampaignArchivedFilter(!campaignArchivedFilter)}>
                    Campagne archivée ({campaignBundlesCount(CampaignSteps.Archived)})
                </Tag>
                <Tag as="span"
                     selected={outsideCampaignFilter}
                     onClick={() => setOutsideCampaignInProgressFilter(!outsideCampaignFilter)}>
                    Hors campagne ({campaignBundlesCount(CampaignSteps.Outside)})
                </Tag>
            </TagGroup>
            {filteredCampaignBundles && !filteredCampaignBundles.length &&
                <Text>Aucune campagne</Text>
            }
            {filteredCampaignBundles && filteredCampaignBundles.sort(CampaignNumberSort).map(campaignBundle =>
                <div key={`CampaignBundle_${campaignBundle.campaignIds.join('-')}`} className={styles.campaignCard}>
                    <Row gutters alignItems="top" spacing="mb-1w">
                        <Col>
                            <Title as="h2" look="h3" className="fr-mb-0">
                                {campaignFullName(campaignBundle)}
                            </Title>
                            {(campaignBundle.campaignNumber ?? 0) > 0 ?
                                <Text size="sm" className="subtitle">
                                    échantillon créé le <b>{format(campaignBundle.createdAt, 'dd/MM/yy', { locale: fr })}</b>
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
                                {mainCampaignOfBundle(campaignBundle).sendingDate &&
                                    <AppCard icon="ri-send-plane-fill" isGrey={true}>
                                        <Text as="span">
                                            envoyée le <b>{format(mainCampaignOfBundle(campaignBundle).sendingDate!, 'dd/MM/yy', { locale: fr })}</b>
                                        </Text>
                                    </AppCard>
                                }
                                {campaignBundleStep(campaignBundle) === CampaignSteps.Archived &&
                                    <CampaignBundleStats campaignBundle={campaignBundle} isArchived={true}/>
                                }
                            </div>
                        </Col>
                        {(campaignBundle.campaignNumber ?? 0) > 0 && campaignBundleStep(campaignBundle) !== CampaignSteps.Archived &&
                            <Col n="6">
                                {campaignBundleStep(campaignBundle) === CampaignSteps.Export &&
                                    <div className="fr-p-4w bg-bf975">
                                        <Stepper
                                            steps={3}
                                            currentStep={1}
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
                                {campaignBundleStep(campaignBundle) === CampaignSteps.Sending &&
                                    <div className="fr-p-4w bg-bf975">
                                        <Stepper
                                            steps={3}
                                            currentStep={2}
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
                                {campaignBundleStep(campaignBundle) === CampaignSteps.InProgress &&
                                    <div className="fr-p-4w bg-bf975">
                                        <Title as="h3" look="h6">
                                            Suivi en cours
                                        </Title>
                                        <CampaignBundleStats campaignBundle={campaignBundle} isArchived={false}/>
                                    </div>
                                }
                            </Col>
                        }
                    </Row>
                    {(reminderCampaignsOfBundle(campaignBundle).length > 0) &&
                        reminderCampaignsOfBundle(campaignBundle).map((campaign, campaignIndex) =>
                        <div key={`Campaign_${campaign.id}`}>
                            <hr className="fr-pb-1w fr-mt-1w"/>
                            <Row gutters alignItems="middle">
                                <Col n="9">
                                    Relance n° {campaign.reminderNumber} ({format(campaign.createdAt, 'dd/MM/yy', { locale: fr })})
                                </Col>
                                <Col n="3" className="align-right">
                                    {campaignIndex === reminderCampaignsOfBundle(campaignBundle).length - 1 && withDeletion &&
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
                                            className="fr-btn--tertiary-no-outline fix-vertical-align"
                                    >
                                        Accéder
                                    </Button>
                                </Col>
                            </Row>
                        </div>
                    )}
                    <hr className="fr-pb-2w fr-mt-1w"/>
                    <Row>
                        <Col className="align-right">
                            {(campaignBundle.campaignNumber ?? 0) > 0
                                && withDeletion
                                && reminderCampaignsOfBundle(campaignBundle).length === 0
                                &&campaignBundleStep(campaignBundle) !== CampaignSteps.Archived &&
                                <Button title="Supprimer"
                                        tertiary
                                        onClick={() => setDeletionModalCampaignBundleId(campaignBundle)}
                                        className="fr-btn--tertiary-no-outline"
                                        icon="ri-delete-bin-5-fill"
                                >
                                    Supprimer
                                </Button>
                            }
                            {campaignBundleStep(campaignBundle) === CampaignSteps.InProgress &&
                                <Button title="Archiver"
                                        secondary
                                        onClick={() => setArchiveModalCampaignIds(campaignBundle.campaignIds)}
                                        icon="ri-archive-fill"
                                        className="fr-mr-2w"
                                >
                                    Archiver
                                </Button>
                            }
                            <Button title="Accéder"
                                    onClick={() => history.push('/campagnes/C' + campaignBundle.campaignNumber)}
                                    icon="ri-arrow-right-line"
                                    iconPosition="right"
                                    className="fix-vertical-align"
                            >
                                {campaignBundleStep(campaignBundle) === CampaignSteps.InProgress ? 'Accéder au suivi' : 'Accéder' }
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
                        <Alert title=""
                               description="Les campagnes suivantes seront renumérotées."
                               type="info"/>
                    }
                    <Alert title=""
                           description='Les statuts des logements "En attente de retour" repasseront en "Jamais contacté". Les autres statuts mis à jour ne seront pas modifiés.'
                           type="info"/>
                </ConfirmationModal>
            }
            {(archiveModalCampaignIds.length > 0) &&
                <ConfirmationModal
                    onSubmit={onArchiveCampaign}
                    onClose={() => setArchiveModalCampaignIds([])}>
                    <Text size="md">
                        Êtes-vous sûr de vouloir archiver cette campagne {archiveModalCampaignIds.length > 1 ? 'et ses relances ' : ''} ?
                    </Text>
                </ConfirmationModal>
            }
        </>
    );
};

export default CampaignBundleList;
