import React, { ChangeEvent, useEffect, useState } from 'react';
import { Button, Col, Container, Row, TextInput, Title } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import {
    changeCampaignHousingPagination,
    getCampaign,
    listCampaignHousing,
    validCampaignStep,
} from '../../store/actions/campaignAction';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { campaignStep, CampaignSteps } from '../../models/Campaign';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import { useParams } from 'react-router-dom';
import styles from './campaign.module.scss';
import classNames from 'classnames';
import HousingList, { HousingDisplayKey } from '../../components/HousingList/HousingList';
import CampaignExportModal from '../../components/modals/CampaignExportModal/CampaignExportModal';
import { format, isDate, parse } from 'date-fns';
import * as yup from 'yup';
import { ValidationError } from 'yup/es';
import { SelectedHousing } from '../../models/Housing';
import CampaignInProgress from './CampainInProgress';


const CampaignView = () => {

    const dispatch = useDispatch();
    const { id } = useParams<{id: string}>();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedHousing, setSelectedHousing] = useState<SelectedHousing>({all: false, ids: []});
    const [removedHousingIds, setRemovedHousingIds] = useState<string[]>([]);
    const [forcedStep, setForcedStep] = useState<CampaignSteps>();

    const [sendingDate, setSendingDate] = useState(format(new Date(), 'dd/MM/yyyy'));
    const [errors, setErrors] = useState<any>({});

    const sendingForm = yup.object().shape({
        sendingDate: yup
            .date()
            .transform((curr, originalValue) => {
                return !originalValue.length ? null : (isDate(originalValue) ? originalValue : parse(originalValue, 'dd/MM/yyyy', new Date()))
            })
            .typeError('Veuillez renseigner une date valide.')
    });

    const { campaign, paginatedHousing, exportURL } = useSelector((state: ApplicationState) => state.campaign);

    useEffect(() => {
        dispatch(listCampaignHousing(id))
        dispatch(getCampaign(id))
    }, [id, dispatch])

    const remove = () => {
        const removedIds = [...removedHousingIds, ...selectedHousing.ids]
        setRemovedHousingIds(removedIds)
        dispatch(changeCampaignHousingPagination(paginatedHousing.page, paginatedHousing.perPage, removedIds))
    }

    const currentStep = (): CampaignSteps => {
        return forcedStep ?? campaignStep(campaign)
    }

    const validStep = (step: CampaignSteps) => {
        if (campaign) {
            if (step === CampaignSteps.Sending) {
                sendingForm
                    .validate({ sendingDate }, {abortEarly: false})
                    .then(() => {
                        dispatch(validCampaignStep(campaign.id, step, {sendingDate : sendingDate.length ? parse(sendingDate, 'dd/MM/yyyy', new Date()) : undefined}))
                    })
                    .catch(err => {
                        const object: any = {};
                        err.inner.forEach((x: ValidationError) => {
                            if (x.path !== undefined && x.errors.length) {
                                object[x.path] = x.errors[0];
                            }
                        });
                        setErrors(object);
                    })
            }
            else {
                dispatch(validCampaignStep(campaign.id, step, {excludeHousingIds: removedHousingIds}))
            }
            setForcedStep(step + 1)
        }
    }

    return (
        <>
            {campaign &&
                <>
                    <div className="bg-100">
                        <Container className="bg-100">
                            <AppBreadcrumb additionalItems={[{ url: '', label: campaign.name }]}/>
                            <Row>
                                <Col>
                                    <Title as="h1">{campaign.name}</Title>
                                </Col>
                                <Col>
                                    {/*<AppSearchBar onSearch={(input: string) => {}} />*/}
                                </Col>
                            </Row>
                            <Row>
                                <Col spacing="my-3w">
                                    <div className={styles.campaignStat}>
                                        <div className={styles.statTitle}>{campaign.ownerCount}</div>
                                        <span className={styles.statLabel}>{campaign.ownerCount <= 1 ? 'propriétaire' : 'propriétaires'}</span>
                                    </div>
                                    <div className={styles.campaignStat}>
                                        <div className={styles.statTitle}>{campaign.housingCount}</div>
                                        <span className={styles.statLabel}>{campaign.housingCount <= 1 ? 'logement' : 'logements'}</span>
                                    </div>
                                    <div className={styles.campaignStat}>
                                        <div className={styles.statTitle}> - </div>
                                        <span className={styles.statLabel}>retours</span>
                                    </div>
                                </Col>
                            </Row>
                        </Container>
                    </div>
                    <Container spacing="py-4w">

                        {currentStep() < CampaignSteps.InProgess &&
                        <>
                            <div className={classNames(styles.campaignStep,
                                currentStep() === CampaignSteps.OwnersValidation ? styles.currentStep :
                                    currentStep() > CampaignSteps.OwnersValidation ? styles.oldStep : '')}>
                                <div className={styles.stepLabel}>
                                    <div>
                                        <div className={styles.stepNumber}>1</div>
                                    </div>
                                    <div>
                                        <h2>Création de la liste des propriétaires</h2>
                                        <span>Ajoutez ou supprimez des propriétaires de votre campagne.</span>
                                    </div>
                                    {currentStep() === CampaignSteps.OwnersValidation &&
                                    <Button
                                        onClick={() => validStep(CampaignSteps.OwnersValidation)}
                                        title="Valider"
                                        className={styles.stepAction}>
                                        Valider
                                    </Button>
                                    }
                                    {currentStep() > CampaignSteps.OwnersValidation &&
                                    <div className={classNames(styles.stepAction, styles.success)}>
                                        <button
                                            className="ds-fr--inline fr-link"
                                            type="button"
                                            title="Modifier la liste"
                                            onClick={() => setForcedStep(CampaignSteps.OwnersValidation)}>
                                            Modifier la liste
                                        </button>
                                        <span className="fr-fi-check-line" aria-hidden="true" />
                                    </div>
                                    }
                                </div>
                                {currentStep() === CampaignSteps.OwnersValidation &&
                                <div className="fr-pt-4w">
                                    <button
                                        className="ds-fr--inline fr-link"
                                        type="button"
                                        title="Supprimer de la liste"
                                        onClick={() => remove()}>
                                        Supprimer de la liste
                                    </button>
                                    <HousingList paginatedHousing={paginatedHousing}
                                                 onChangePagination={(page, perPage) => dispatch(changeCampaignHousingPagination(page, perPage))}
                                                 displayKind={HousingDisplayKey.Housing}
                                                 onSelectHousing={(selectedHousing: SelectedHousing) => setSelectedHousing(selectedHousing)}/>
                                </div>
                                }
                            </div>

                            <div className={classNames(styles.campaignStep,
                                currentStep() === CampaignSteps.Export ? styles.currentStep :
                                    currentStep() > CampaignSteps.Export ? styles.oldStep : '')}>
                                <div className={styles.stepLabel}>
                                    <div>
                                        <div className={styles.stepNumber}>2</div>
                                    </div>
                                    <div>
                                        <h2>Export du fichier de données propriétaires</h2>
                                        <span>
                                            Ajustez les variables et exportez vos données pour créer votre fichier de publipostage, pour votre envoi email
                                            <br />ou en vue d’une rencontre avec les propriétaires.
                                        </span>
                                    </div>
                                    {currentStep() < CampaignSteps.Export &&
                                    <Button
                                        disabled
                                        title="En attente"
                                        className={styles.stepAction}>
                                        En attente
                                    </Button>
                                    }
                                    {currentStep() === CampaignSteps.Export &&
                                    <>
                                    <Button title="Exporter"
                                            onClick={() => setIsModalOpen(true)}
                                            data-testid="export-campaign-button"
                                            className={styles.stepAction}>
                                        Exporter
                                    </Button>
                                    {isModalOpen &&
                                    <CampaignExportModal housingCount={campaign.housingCount}
                                                         ownerCount={campaign.ownerCount}
                                                         exportURL={exportURL}
                                                         onSubmit={() => {
                                                             validStep(CampaignSteps.Export);
                                                             setIsModalOpen(false);
                                                         }}
                                                         onClose={() => setIsModalOpen(false)}/>
                                    }
                                    </>
                                    }
                                    {currentStep() > CampaignSteps.Export &&
                                    <div className={classNames(styles.stepAction, styles.success)}>
                                        <button
                                            className="ds-fr--inline fr-link"
                                            type="button"
                                            title="Modifier"
                                            onClick={() => setForcedStep(CampaignSteps.Export)}>
                                            Modifier
                                        </button>
                                        <span className="fr-fi-check-line" aria-hidden="true" />
                                    </div>
                                    }
                                </div>
                            </div>

                            <div className={classNames(styles.campaignStep,
                                currentStep() === CampaignSteps.Sending ? styles.currentStep :
                                    currentStep() > CampaignSteps.Sending ? styles.oldStep : '')}>
                                <div className={styles.stepLabel}>
                                    <div>
                                        <div className={styles.stepNumber}>3</div>
                                    </div>
                                    <div>
                                        <h2>Envoi de la campagne</h2>
                                        <span>Datez l’envoi qui marque le début de votre campagne.</span>
                                    </div>
                                    {currentStep() < CampaignSteps.Sending &&
                                    <Button
                                        disabled
                                        title="En attente"
                                        className={styles.stepAction}>
                                        En attente
                                    </Button>
                                    }
                                </div>
                                {currentStep() === CampaignSteps.Sending &&
                                <Row spacing="pt-3w pl-4w ml-4w" className="fr-grid-row--bottom">
                                    <Col n="3">
                                        <TextInput
                                            value={sendingDate}
                                            onChange={(e: ChangeEvent<HTMLInputElement>) => setSendingDate(e.target.value)}
                                            label="Date d'envoi"
                                            messageType={errors['sendingDate'] ? 'error' : ''}
                                            message={errors['sendingDate']}
                                        />
                                    </Col>
                                    <Col>
                                        <Button
                                            onClick={() => validStep(CampaignSteps.Sending)}
                                            title="Valider"
                                            className={styles.stepAction}>
                                            Confirmer
                                        </Button>
                                    </Col>
                                </Row>
                                }
                            </div>

                            <div className={styles.campaignStep}>
                                <div className={styles.stepLabel}>
                                    <div>
                                        <div className={styles.stepNumber}>4</div>
                                    </div>
                                    <div>
                                        <h2>Suivi de la campagne</h2>
                                        <span>Complétez et suivez toutes les interactions avec les propriétaires.</span>
                                    </div>
                                    <Button
                                        disabled
                                        title="En attente"
                                        className={styles.stepAction}>
                                        En attente
                                    </Button>
                                </div>
                            </div>
                        </>
                        }

                        {currentStep() === CampaignSteps.InProgess &&
                            <CampaignInProgress />
                        }
                    </Container>
                </>
            }
        </>
    );
};

export default CampaignView;

