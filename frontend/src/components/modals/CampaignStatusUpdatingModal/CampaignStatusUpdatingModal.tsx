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
import { CampaignHousing, CampaignHousingUpdate } from '../../../models/Housing';
import {
    CampaignHousingStates,
    CampaignHousingStatus,
    getCampaignHousingState,
    getPrecisionOptions,
    getStepOptions,
} from '../../../models/CampaignHousingState';
import { DefaultOption, SelectOption } from '../../../models/SelectOption';

import * as yup from 'yup';
import { ValidationError } from 'yup/es';
import { displayCount } from '../../../utils/stringUtils';

const CampaignStatusUpdatingModal = (
    {
        campaignHousing,
        housingCount,
        initialStatus,
        onSubmit,
        onClose
    }: {
        campaignHousing?: CampaignHousing,
        housingCount?: number,
        initialStatus: CampaignHousingStatus,
        onSubmit: (campaignHousingUpdate: CampaignHousingUpdate) => void,
        onClose: () => void
    }) => {


    const [status, setStatus] = useState<CampaignHousingStatus>(campaignHousing ? campaignHousing.status : initialStatus);
    const [step, setStep] = useState<string | undefined>(campaignHousing?.step);
    const [precision, setPrecision] = useState<string | undefined>(campaignHousing?.precision);
    const [stepOptions, setStepOptions] = useState<SelectOption[] | undefined>(getStepOptions(status));
    const [precisionOptions, setPrecisionOptions] = useState<SelectOption[] | undefined>(getPrecisionOptions(status, step));
    const [contactKind, setContactKind] = useState<string | undefined>(undefined)
    const [comment, setComment] = useState<string>('')
    const [formErrors, setFormErrors] = useState<any>({});

    const statusOptions = CampaignHousingStates.map(status => (
        {value: String(status.status), label: status.title}
    ))

    const selectStatus = (newStatus: CampaignHousingStatus) => {
        setStatus(newStatus);
        setStep(undefined);
        setPrecision(undefined);
        setStepOptions(getStepOptions(newStatus));
        setPrecisionOptions(undefined);
    }

    const selectStep = (newStep: string) => {
        setStep(newStep);
        setPrecision(undefined);
        setPrecisionOptions(getPrecisionOptions(status, newStep));
    }

    const contactKindOptions = [
        DefaultOption,
        {value: 'Appel entrant', label: 'Appel entrant'}
    ]

    const updatingForm = yup.object().shape({
        status: yup.string().required('Veuillez sélectionner un statut.'),
        step: yup.string().nullable().when('hasSteps', {
            is: true,
            then: yup.string().required('Veuillez sélectionner une étape.')
        }),
        precision: yup.string().nullable().when('hasPrecisions', {
            is: true,
            then: yup.string().required('Veuillez sélectionner une précision.')
        }),
        contactKind: yup.string().required('Veuillez sélectionner une intéraction.'),
    });

    const submitForm = () => {
        setFormErrors({});
        updatingForm
            .validate({ hasSteps: stepOptions !== undefined, hasPrecisions: precisionOptions !== undefined, status, step, precision, contactKind }, {abortEarly: false})
            .then(() => onSubmit({
                prevStatus: initialStatus,
                status: +status,
                step,
                precision,
                contactKind,
                comment
            }))
            .catch((err: any) => {
                const object: any = {};
                err.inner.forEach((x: ValidationError) => {
                    if (x.path !== undefined && x.errors.length) {
                        object[x.path] = x.errors[0];
                    }
                });
                setFormErrors(object);
            })
    }

    return (
        <Modal isOpen={true}
               hide={() => onClose()}
               data-testid="campaign-creation-modal"
               size="lg">
            <ModalClose hide={() => onClose()} title="Fermer la fenêtre">Fermer</ModalClose>
            <ModalTitle>
                <span className="ri-1x icon-left ri-arrow-right-line ds-fr--v-middle" />
                Mettre à jour le dossier
            </ModalTitle>
            <ModalContent>
                <Container fluid>
                    {campaignHousing &&
                        <Text>
                            Logement concerné : {campaignHousing.rawAddress.join(' - ')}
                        </Text>
                    }
                    {housingCount &&
                        <Text>
                            {displayCount(housingCount, 'logement concerné')}.
                        </Text>
                    }
                    <Text className="fr-mb-2w">
                        <b>CHANGEMENT DE STATUT</b>
                    </Text>
                    <Text className="fr-mb-2w">
                        Statut actuel :&nbsp;
                        <span className="status-label">{getCampaignHousingState(status).title}</span>
                    </Text>
                    <Row gutters>
                        <Col n="4">
                            <Select
                                label="Nouveau statut"
                                options={statusOptions}
                                selected={String(status)}
                                messageType={formErrors['status'] ? 'error' : undefined}
                                message={formErrors['status']}
                                onChange={(e: any) => selectStatus(e.target.value)}/>
                        </Col>
                        <Col n="4">
                            {stepOptions &&
                            <Select
                                label="Étape"
                                options={stepOptions}
                                selected={step}
                                messageType={formErrors['step'] ? 'error' : undefined}
                                message={formErrors['step']}
                                onChange={(e: any) => selectStep(e.target.value)}/>
                            }
                        </Col>
                        <Col n="4">
                            {precisionOptions &&
                            <Select
                                label="Précision"
                                options={precisionOptions}
                                selected={precision}
                                messageType={formErrors['precision'] ? 'error' : undefined}
                                message={formErrors['precision']}
                                onChange={(e: any) => setPrecision(e.target.value)}/>
                            }
                        </Col>
                    </Row>
                    <Text className="fr-mb-2w fr-mt-4w">
                        <b>INTERACTIONS</b>
                    </Text>
                    <Row gutters>
                        <Col n="4">
                            <Select
                                label="Type d'intéraction"
                                options={contactKindOptions}
                                selected={contactKind}
                                messageType={formErrors['contactKind'] ? 'error' : undefined}
                                message={formErrors['contactKind']}
                                onChange={(e: any) => setContactKind(e.target.value)}/>
                        </Col>
                    </Row>
                    <Row gutters>
                        <Col n="12">
                            <TextInput
                                textarea
                                label="Commentaire"
                                rows="3"
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setComment(e.target.value)}
                            />
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
                        onClick={() => submitForm()}>
                    Enregistrer
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default CampaignStatusUpdatingModal;

