import React, { ChangeEvent, useEffect, useState } from 'react';
import { Button, Col, Container, Row, Tab, Tabs, TextInput, Title } from '@dataesr/react-dsfr';
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


const CampaignView = () => {

    const dispatch = useDispatch();
    const { id } = useParams<{id: string}>();

    const [isModalOpen, setIsModalOpen] = useState(false);
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


    const validStep = (step: CampaignSteps) => {
        if (campaign) {
            if (step === CampaignSteps.Sending) {
                sendingForm
                    .validate({ sendingDate }, {abortEarly: false})
                    .then(() => {
                        dispatch(validCampaignStep(campaign.id, step, sendingDate.length ? parse(sendingDate, 'dd/MM/yyyy', new Date()) : undefined,))
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
                dispatch(validCampaignStep(campaign.id, step))
            }
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
                                    <span className={styles.statLabel}>propriétaires</span>
                                </div>
                                <div className={styles.campaignStat}>
                                    <div className={styles.statTitle}>{campaign.housingCount}</div>
                                    <span className={styles.statLabel}>logement</span>
                                </div>
                                <div className={styles.campaignStat}>
                                    <div className={styles.statTitle}> -</div>
                                    <span className={styles.statLabel}>retours</span>
                                </div>
                            </Col>
                        </Row>
                    </Container>
                </div>


                    {Boolean(paginatedHousing.entities.length) &&
                    <Container spacing="py-4w">

                        {campaignStep(campaign) < CampaignSteps.InProgess &&
                        <>
                            <div className={classNames(styles.campaignStep,
                                campaignStep(campaign) === CampaignSteps.OwnersValidation ? styles.currentStep :
                                    campaignStep(campaign) > CampaignSteps.OwnersValidation ? styles.oldStep : '')}>
                                <div className={styles.stepLabel}>
                                    <div>
                                        <div className={styles.stepNumber}>1</div>
                                    </div>
                                    <div>
                                        <h2>Validation de la liste des propriétaires</h2>
                                        <span>Validez la liste des propriétaires et logements à inclure dans votre campagne</span>
                                    </div>
                                    {campaignStep(campaign) === CampaignSteps.OwnersValidation &&
                                    <Button
                                        onClick={() => validStep(CampaignSteps.OwnersValidation)}
                                        title="Valider">
                                        Valider
                                    </Button>
                                    }
                                </div>
                                {campaignStep(campaign) === CampaignSteps.OwnersValidation &&
                                <div className="fr-pt-4w">
                                    <HousingList paginatedHousing={paginatedHousing}
                                                 onChangePagination={(page, perPage) => dispatch(changeCampaignHousingPagination(page, perPage))}
                                                 displayKind={HousingDisplayKey.Owner}/>
                                </div>
                                }
                            </div>

                            <div className={classNames(styles.campaignStep,
                                campaignStep(campaign) === CampaignSteps.Export ? styles.currentStep :
                                    campaignStep(campaign) > CampaignSteps.Export ? styles.oldStep : '')}>
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
                                    {campaignStep(campaign) < CampaignSteps.Export &&
                                    <Button
                                        disabled
                                        title="En attente">
                                        En attente
                                    </Button>
                                    }
                                    {campaignStep(campaign) === CampaignSteps.Export &&
                                    <>
                                        <Button title="Exporter"
                                                onClick={() => setIsModalOpen(true)}
                                                data-testid="export-campaign-button"
                                                className="float-right">
                                            Exporter
                                        </Button>
                                        {isModalOpen &&
                                        <CampaignExportModal housingCount={campaign.housingCount}
                                                             ownerCount={campaign.ownerCount}
                                                             exportURL={exportURL}
                                                             onSubmit={() => validStep(CampaignSteps.Export)}
                                                             onClose={() => setIsModalOpen(false)}/>
                                        }
                                    </>
                                    }
                                </div>
                            </div>

                            <div className={classNames(styles.campaignStep,
                                campaignStep(campaign) === CampaignSteps.Sending ? styles.currentStep :
                                    campaignStep(campaign) > CampaignSteps.Sending ? styles.oldStep : '')}>
                                <div className={styles.stepLabel}>
                                    <div>
                                        <div className={styles.stepNumber}>3</div>
                                    </div>
                                    <div>
                                        <h2>Envoi de la campagne</h2>
                                        <span>Datez l’envoi qui marque le début de votre campagne.</span>
                                    </div>
                                    {campaignStep(campaign) < CampaignSteps.Sending &&
                                    <Button
                                        disabled
                                        title="En attente">
                                        En attente
                                    </Button>
                                    }
                                </div>
                                {campaignStep(campaign) === CampaignSteps.Sending &&
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
                                        <Button className="float-right"
                                            onClick={() => validStep(CampaignSteps.Sending)}
                                            title="Valider">
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
                                        title="En attente">
                                        En attente
                                    </Button>
                                </div>
                            </div>
                        </>
                        }

                        {campaignStep(campaign) === CampaignSteps.InProgess &&
                        <Tabs>
                            <Tab label={`En attente de retour (${paginatedHousing.entities.length})`}>
                                <div className="fr-pt-4w">
                                    <HousingList paginatedHousing={paginatedHousing}
                                                 onChangePagination={(page, perPage) => dispatch(changeCampaignHousingPagination(page, perPage))}
                                                 displayKind={HousingDisplayKey.Owner}/>
                                </div>
                            </Tab>
                            <Tab label="Suivi en cours (0)">
                                TODO
                            </Tab>
                            <Tab label="Sans suite (0)">
                                TODO
                            </Tab>
                            <Tab label="Non vacant (0)">
                                TODO
                            </Tab>
                            <Tab label="Sortie de procédure (0)">
                                TODO
                            </Tab>
                        </Tabs>
                        }
                    </Container>
                    }
                </>
            }
        </>
    );
};

export default CampaignView;

