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
    Tag,
    Text,
} from '@dataesr/react-dsfr';
import { CampaignHousing } from '../../../models/Housing';
import {
    CampaignHousingStates,
    CampaignHousingStatus,
    getPrecisionOptions,
    getStepOptions,
} from '../../../models/CampaignHousingStatus';
import { SelectOption } from '../../../models/SelectOption';

import * as yup from 'yup';
import { ValidationError } from 'yup/es';

const CampaignStatusUpdatingModal = (
    {
        campaignHousing,
        onSubmit,
        onClose
    }: {
        campaignHousing: CampaignHousing,
        onSubmit: (campaignHousing: CampaignHousing) => void,
        onClose: () => void
    }) => {


    const [status, setStatus] = useState<CampaignHousingStatus>(campaignHousing.status);
    const [step, setStep] = useState<string | undefined>(campaignHousing.step);
    const [precision, setPrecision] = useState<string | undefined>(campaignHousing.precision);
    const [stepOptions, setStepOptions] = useState<SelectOption[] | undefined>(getStepOptions(status));
    const [precisionOptions, setPrecisionOptions] = useState<SelectOption[] | undefined>(getPrecisionOptions(status, step));
    const [formErrors, setFormErrors] = useState<any>({});

    const statusOptions = CampaignHousingStates.map(status => (
        {value: status.status, label: status.title}
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

    const updatingForm = yup.object().shape({
        status: yup.string().required('Veuillez sélectionner un statut.'),
        step: yup.string().when('hasSteps', {
            is: true,
            then: yup.string().required('Veuillez sélectionner une étape.')
        }),
        precision: yup.string().when('hasPrecisions', {
            is: true,
            then: yup.string().required('Veuillez sélectionner une précision.')
        }),
    });

    const submitForm = () => {
        setFormErrors({});
        updatingForm
            .validate({ hasSteps: stepOptions !== undefined, hasPrecisions: precisionOptions !== undefined, status, step, precision }, {abortEarly: false})
            .then(() => onSubmit({
                ...campaignHousing,
                status,
                step,
                precision
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
                    <Text>
                        Logement concerné : {campaignHousing.rawAddress.reduce((a1, a2) => `${a1} - ${a2}`)}
                    </Text>
                    <Text>
                        Statut actuel :&nbsp;
                        <Tag as="span" size="sm">Suivi en cours</Tag>
                    </Text>
                    <Row gutters>
                        <Col n="4">
                            <Select
                                label="Nouveau statut"
                                options={statusOptions}
                                selected={status}
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

