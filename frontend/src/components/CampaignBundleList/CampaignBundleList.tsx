import React, { ChangeEvent, useEffect, useState } from 'react';

import { Alert, Button, Col, Row, Tag, TagGroup, Text, TextInput, Title } from '@dataesr/react-dsfr';

import styles from '../../views/Campaign/campaign.module.scss';
import { useHistory } from 'react-router-dom';
import {
    CampaignBundle,
    CampaignBundleId,
    campaignBundleIdUrlFragment,
    CampaignNumberSort,
    campaignStep,
    CampaignSteps,
    mainCampaign,
    reminderCampaigns,
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
import CampaignExportModal from '../modals/CampaignExportModal/CampaignExportModal';
import * as yup from 'yup';
import { dateValidator, useForm } from '../../hooks/useForm';
import Stepper from '../Stepper/Stepper';
import CampaignBundleStats from '../CampaignBundle/CampaignBundleStats';
import CampaignBundleInfos from '../CampaignBundle/CampaignBundleInfos';
import CampaignBundleTitle from '../CampaignBundleTitle/CampaignBundleTitle';


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
    }, [dispatch])

    useEffect(() => {
        setFilteredCampaignBundles(
            campaignBundleList?.filter(campaignBundle =>
                (campaignInProgressFilter && stepFilter(CampaignSteps.InProgress)(campaignBundle)) ||
                (campaignNoSentFilter && (
                    stepFilter(CampaignSteps.OwnersValidation)(campaignBundle) ||
                    stepFilter(CampaignSteps.Export)(campaignBundle) ||
                    stepFilter(CampaignSteps.Confirmation)(campaignBundle)
                )) ||
                (outsideCampaignFilter && stepFilter(CampaignSteps.Outside)(campaignBundle)) ||
                (campaignArchivedFilter && stepFilter(CampaignSteps.Archived)(campaignBundle))
            )
        )
    }, [campaignBundleList, campaignInProgressFilter, outsideCampaignFilter, campaignNoSentFilter, campaignArchivedFilter]) //eslint-disable-line react-hooks/exhaustive-deps

    const stepFilter = (step: CampaignSteps) => (campaignBundle: CampaignBundle) => campaignBundleStep(campaignBundle) === step

    const campaignBundlesCount = (step: CampaignSteps) =>
        campaignBundleList?.filter(stepFilter(step)).length ?? 0

    const mainCampaignOfBundle = mainCampaign(campaignList ?? [])
    const reminderCampaignsOfBundle = reminderCampaigns(campaignList ?? [])
    const campaignBundleStep = (bundle: CampaignBundle): CampaignSteps | null => {
        const main = mainCampaignOfBundle(bundle)
        return main ? campaignStep(main) : null
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
                dispatch(validCampaignStep(campaignId, CampaignSteps.Sending, {
                    sendingDate: parse(sendingDate, 'dd/MM/yyyy', new Date()),
                    skipConfirmation: true
                }))
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
                     small
                     selected={campaignInProgressFilter}
                     onClick={() => setCampaignInProgressFilter(!campaignInProgressFilter)}>
                    Suivi en cours ({campaignBundlesCount(CampaignSteps.InProgress)})
                </Tag>
                <Tag as="span"
                     small
                     selected={campaignNoSentFilter}
                     onClick={() => setCampaignNotSentFilter(!campaignNoSentFilter)}>
                    Campagne en attente d'envoi ({campaignBundlesCount(CampaignSteps.OwnersValidation) + campaignBundlesCount(CampaignSteps.Export) + campaignBundlesCount(CampaignSteps.Confirmation)})
                </Tag>
                <Tag as="span"
                     small
                     selected={campaignArchivedFilter}
                     onClick={() => setCampaignArchivedFilter(!campaignArchivedFilter)}>
                    Campagne archivée ({campaignBundlesCount(CampaignSteps.Archived)})
                </Tag>
                <Tag as="span"
                     small
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
                            <CampaignBundleTitle campaignBundle={campaignBundle} as="h2"/>
                            <div>
                                <CampaignBundleInfos campaignBundle={campaignBundle} isGrey={true}/>
                                {campaignBundleStep(campaignBundle) === CampaignSteps.Archived &&
                                    <CampaignBundleStats campaignBundle={campaignBundle} isArchived={true}/>
                                }
                            </div>
                        </Col>
                        {(campaignBundle.campaignNumber ?? 0) > 0 && campaignBundleStep(campaignBundle) !== CampaignSteps.Archived &&
                            <Col n="6">
                                {campaignBundleStep(campaignBundle) === CampaignSteps.Export &&
                                    <div className="fr-p-3w bg-bf975">
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
                                    <div className="fr-p-3w bg-bf975">
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
                                    <div className="fr-pl-2w fr-py-3w bg-bf975">
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
                                    {campaignIndex === reminderCampaignsOfBundle(campaignBundle).length - 1
                                        && withDeletion
                                        && campaignBundleStep(campaignBundle) !== CampaignSteps.Archived &&
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
                        <Alert description="Les campagnes suivantes seront renumérotées."
                               type="info"/>
                    }
                    <Alert description='Les statuts des logements "En attente de retour" repasseront en "Jamais contacté". Les autres statuts mis à jour ne seront pas modifiés.'
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
