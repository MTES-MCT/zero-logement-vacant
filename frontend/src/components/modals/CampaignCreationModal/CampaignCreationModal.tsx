import React, { useState } from 'react';
import {
    Button,
    Col,
    Container,
    Modal,
    ModalClose,
    ModalContent,
    ModalFooter,
    ModalTitle,
    Row,
    Select,
    Text,
} from '@dataesr/react-dsfr';
import { addMonths, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSelector } from 'react-redux';
import { ApplicationState } from '../../../store/reducers/applicationReducers';
import HousingFiltersBadges from '../../HousingFiltersBadges/HousingFiltersBadges';
import { CampaignKinds, DraftCampaign } from '../../../models/Campaign';

import * as yup from 'yup';
import { ValidationError } from 'yup/es';
import { hasFilters } from '../../../models/HousingFilters';

const CampaignCreationModal = ({housingCount, onSubmit, onClose}: {housingCount: number, onSubmit: (draftCampaign: DraftCampaign) => void, onClose: () => void}) => {

    const [campaignStartMonth, setCampaignStartMonth] = useState('');
    const [campaignKind, setCampaignKind] = useState('');
    const [errors, setErrors] = useState<any>({});

    const campaignForm = yup.object().shape({
        campaignStartMonth: yup.string().required('Veuillez sélectionner le mois de lancement de la campagne.'),
        campaignKind: yup.string().required('Veuillez sélectionner le type de campagne.')
    });

    const { paginatedHousing, filters } = useSelector((state: ApplicationState) => state.housing);

    const create = () => {
        campaignForm
            .validate({ campaignStartMonth, campaignKind }, {abortEarly: false})
            .then(() => {
                onSubmit({
                    startMonth: campaignStartMonth,
                    kind: CampaignKinds.Initial,
                    filters
                } as DraftCampaign);
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

    const campaignStartOptions = [
        {value: '', label: 'Sélectionner', disabled: true, hidden: true},
        ...[0, 1, 2, 3, 4, 5].map(n => {
            return {
                value: format(addMonths(new Date(), n), 'yyMM'),
                label: format(addMonths(new Date(), n), 'MMMM yyyy', { locale: fr })
            }
        })
    ];

    const campaignKindOptions = [
        {value: '', label: 'Sélectionner', disabled: true, hidden: true},
        {value: 'init', label: 'Envoi initial'}
    ]

    return (
        <Modal isOpen={true}
               hide={() => onClose()}
               data-testid="campaign-creation-modal">
            <ModalClose hide={() => onClose()} title="Fermer la fenêtre">Fermer</ModalClose>
            <ModalTitle>
                <span className="ri-1x icon-left ri-arrow-right-line ds-fr--v-middle" />
                Créer la campagne
            </ModalTitle>
            <ModalContent>
                <Container fluid>
                    <Text size="md">
                        <span data-testid="housing-infos">
                            <b>{housingCount}</b> logements
                        </span>
                    </Text>
                    <Row gutters>
                        <Col n="5">
                            <Select
                                label="Lancement"
                                options={campaignStartOptions}
                                selected={campaignStartMonth}
                                onChange={(e: any) => setCampaignStartMonth(e.target.value)}
                                messageType={errors['campaignStartMonth'] ? 'error' : undefined}
                                message={errors['campaignStartMonth']}
                                data-testid="start-month-select"
                            />
                        </Col>
                        <Col n="5">
                            <Select
                                label="Envoi"
                                options={campaignKindOptions}
                                selected={campaignKind}
                                onChange={(e: any) => setCampaignKind(e.target.value)}
                                messageType={errors['campaignKind'] ? 'error' : undefined}
                                message={errors['campaignKind']}
                            />
                        </Col>
                    </Row>
                    <Row className="fr-mt-4w">
                        <Col>
                            {hasFilters(filters) ?
                                <>
                                La liste a été établie à partir des filtres suivants :
                                <div className="fr-my-1w">
                                    <HousingFiltersBadges/>
                                </div>
                                </> :
                                <div>La liste a été établie sans filtres.</div>

                            }
                            {paginatedHousing.totalCount === housingCount ?
                                <></> :
                                paginatedHousing.totalCount - housingCount === 1 ?
                                    <i>Un logement a été retiré des résultats de la recherche{hasFilters(filters) && <> avec ces filtres</>}.</i> :
                                    <i>{paginatedHousing.totalCount - housingCount} logements ont été retirés des résultats de la recherche{hasFilters(filters) && <> avec ces filtres</>}.</i>
                            }
                        </Col>
                    </Row>
                </Container>
            </ModalContent>
            <ModalFooter>
                <Button title="title"
                        secondary
                        className="fr-mr-2w"
                        onClick={() => onClose()}>
                    Annuler
                </Button>
                <Button title="title"
                        onClick={() => create()}
                        data-testid="create-button">
                    Enregistrer
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default CampaignCreationModal;

