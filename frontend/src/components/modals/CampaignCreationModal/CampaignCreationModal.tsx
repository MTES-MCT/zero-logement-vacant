import React, { ChangeEvent, useState } from 'react';
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
    TextInput,
} from '@dataesr/react-dsfr';
import { addMonths, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSelector } from 'react-redux';
import { ApplicationState } from '../../../store/reducers/applicationReducers';
import HousingFiltersBadges from '../../HousingFiltersBadges/HousingFiltersBadges';
import { CampaignKinds, DraftCampaign, getCampaignKindLabel } from '../../../models/Campaign';

import * as yup from 'yup';
import { ValidationError } from 'yup/es';
import { hasFilters } from '../../../models/HousingFilters';
import { displayCount } from '../../../utils/stringUtils';
import { DefaultOption } from '../../../models/SelectOption';

const CampaignCreationModal = (
    {
        housingCount,
        onSubmit,
        onClose
    }: {
        housingCount: number,
        onSubmit: (draftCampaign: DraftCampaign) => void,
        onClose: () => void
    }) => {


    const [campaignStartMonth, setCampaignStartMonth] = useState('');
    const [campaignKind, setCampaignKind] = useState('');
    const [campaignTitle, setCampaignTitle] = useState('');
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
                    kind: parseInt(campaignKind),
                    filters,
                    title: campaignTitle
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
        DefaultOption,
        {value: String(CampaignKinds.Initial), label: getCampaignKindLabel(CampaignKinds.Initial)},
        {value: String(CampaignKinds.Surveying), label: getCampaignKindLabel(CampaignKinds.Surveying)},
        {value: String(CampaignKinds.DoorToDoor), label: getCampaignKindLabel(CampaignKinds.DoorToDoor)},
        {value: String(CampaignKinds.BeforeZlv), label: getCampaignKindLabel(CampaignKinds.BeforeZlv)}
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
                                required
                                messageType={errors['campaignStartMonth'] ? 'error' : undefined}
                                message={errors['campaignStartMonth']}
                                data-testid="start-month-select"
                            />
                        </Col>
                        <Col n="5">
                            <Select
                                label="Type"
                                options={campaignKindOptions}
                                selected={campaignKind}
                                onChange={(e: any) => setCampaignKind(e.target.value)}
                                required
                                messageType={errors['campaignKind'] ? 'error' : undefined}
                                message={errors['campaignKind']}
                            />
                        </Col>
                    </Row>
                    <Row gutters>
                        <Col n="10">
                            <TextInput
                                value={campaignTitle}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setCampaignTitle(e.target.value)}
                                label="Titre complémentaire (optionnel)"
                                placeholder="Titre complémentaire"
                            />
                        </Col>
                    </Row>
                    <Row className="fr-mt-4w">
                        <Col>
                            {hasFilters(filters) ?
                                <>
                                La liste a été établie à partir des filtres suivants :
                                <div className="fr-my-1w">
                                    <HousingFiltersBadges filters={filters}/>
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

export default CampaignCreationModal;

