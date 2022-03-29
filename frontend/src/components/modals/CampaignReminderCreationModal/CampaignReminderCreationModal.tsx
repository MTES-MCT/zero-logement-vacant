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
import HousingFiltersBadges from '../../HousingFiltersBadges/HousingFiltersBadges';

import * as yup from 'yup';
import { ValidationError } from 'yup/es';
import { hasFilters, HousingFilters } from '../../../models/HousingFilters';
import { displayCount } from '../../../utils/stringUtils';

const CampaignReminderCreationModal = (
    {
        housingCount,
        filters,
        onSubmit,
        onClose
    }: {
        housingCount: number,
        filters: HousingFilters,
        onSubmit: (startMonth: string) => void,
        onClose: () => void
    }) => {

    const [campaignStartMonth, setCampaignStartMonth] = useState('');
    const [errors, setErrors] = useState<any>({});

    const campaignForm = yup.object().shape({
        campaignStartMonth: yup.string().required('Veuillez sélectionner le mois de lancement de la campagne de relance.'),
    });

    const create = () => {
        campaignForm
            .validate({ campaignStartMonth }, {abortEarly: false})
            .then(() => {
                onSubmit(campaignStartMonth);
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

    return (
        <Modal isOpen={true}
               hide={() => onClose()}
               data-testid="campaign-creation-modal">
            <ModalClose hide={() => onClose()} title="Fermer la fenêtre">Fermer</ModalClose>
            <ModalTitle>
                <span className="ri-1x icon-left ri-arrow-right-line ds-fr--v-middle" />
                Créer la campagne de relance
            </ModalTitle>
            <ModalContent>
                <Container fluid>
                    <Text size="md">
                        <span data-testid="housing-infos">
                            <b>{displayCount(housingCount, 'logement')}</b>
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
                    </Row>
                    <Row className="fr-mt-4w">
                        <Col>
                            {hasFilters(filters) &&
                                <>
                                <div className="fr-my-1w">
                                    <HousingFiltersBadges filters={filters}/>
                                </div>
                                </>
                            }
                        </Col>
                    </Row>
                </Container>
            </ModalContent>
            <ModalFooter>
                <Button title="Annuler"
                        secondary
                        className="fr-mr-2w"
                        onClick={() => onClose()}>
                    Annuler
                </Button>
                <Button title="Enregistrer"
                        onClick={() => create()}
                        data-testid="create-button">
                    Enregistrer
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default CampaignReminderCreationModal;

