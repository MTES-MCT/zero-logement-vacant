import React, { ChangeEvent, useEffect, useImperativeHandle, useState } from 'react';
import { Col, Row, Select, Text, TextInput } from '@dataesr/react-dsfr';
import { CampaignHousingUpdate } from '../../../models/Housing';
import {
    CampaignHousingStates,
    CampaignHousingStatus,
    getPrecision,
    getCampaignHousingState,
    getStep,
    getPrecisionOptions,
    getStepOptions,
} from '../../../models/CampaignHousingState';
import { DefaultOption, SelectOption } from '../../../models/SelectOption';

import * as yup from 'yup';
import { ValidationError } from 'yup/es';

const CampaignHousingStatusForm = (
    {
        previousStatus,
        previousStep,
        previousPrecision,
        onValidate,
    }: {
        previousStatus: CampaignHousingStatus,
        previousStep?: string,
        previousPrecision?: string,
        onValidate: (campaignHousingUpdate: CampaignHousingUpdate) => void
    }, ref: any) => {

    const [status, setStatus] = useState<CampaignHousingStatus>(previousStatus);
    const [step, setStep] = useState<string | undefined>(previousStep);
    const [precision, setPrecision] = useState<string | undefined>(previousPrecision);
    const [stepOptions, setStepOptions] = useState<SelectOption[]>();
    const [precisionOptions, setPrecisionOptions] = useState<SelectOption[]>();
    const [contactKind, setContactKind] = useState<string>()
    const [comment, setComment] = useState<string>()
    const [formErrors, setFormErrors] = useState<any>({});


    useEffect(() => {
        selectStatus(previousStatus)
    }, [previousStatus])

    const statusOptions = [
        DefaultOption,
        ...CampaignHousingStates.map(status => (
            {value: String(status.status), label: status.title}
        ))
    ]

    const selectStatus = (newStatus: CampaignHousingStatus) => {
        setStatus(newStatus);
        setStepOptions(getStepOptions(newStatus));
        selectStep(getStepOptions(newStatus)?.map(_ => _.label).find(_ => _ === step));
    }

    const selectStep = (newStep?: string) => {
        setStep(newStep);
        if (newStep && status) {
            setPrecisionOptions(getPrecisionOptions(status, newStep));
            setPrecision(getPrecisionOptions(status, newStep)?.map(_ => _.label).find(_ => _ === precision));
        } else {
            setPrecision(undefined);
            setPrecisionOptions(undefined);
        }
    }

    const contactKindOptions = [
        DefaultOption,
        {value: 'Appel entrant', label: 'Appel entrant'},
        {value: 'Appel sortant - relance', label: 'Appel sortant - relance'},
        {value: 'Courrier entrant', label: 'Courrier entrant'},
        {value: 'Formulaire en ligne', label: 'Formulaire en ligne'},
        {value: 'Mail entrant', label: 'Mail entrant'},
        {value: 'Mail sortant', label: 'Mail sortant'},
        {value: 'Retour indirect - via acteur terrain', label: 'Retour indirect - via acteur terrain'},
        {value: 'Retour poste - NPAI', label: 'Retour poste - NPAI'},
        {value: 'Visite - Rencontre', label: 'Visite - Rencontre'}
    ]

    const updatingForm = yup.object().shape({
        status: yup.string().required('Veuillez sélectionner un statut.'),
        step: yup.string().nullable().when('hasSteps', {
            is: true,
            then: yup.string().required('Veuillez sélectionner un sous statut.')
        }),
        precision: yup.string().nullable().when('hasPrecisions', {
            is: true,
            then: yup.string().required('Veuillez sélectionner une précision.')
        }),
        contactKind: yup.string().required('Veuillez sélectionner un type d\'interaction.'),
    });

    useImperativeHandle(ref, () => ({
        validate: () => {
            setFormErrors({});
            updatingForm
                .validate({
                    hasSteps: stepOptions !== undefined,
                    hasPrecisions: precisionOptions !== undefined,
                    status,
                    step,
                    precision,
                    contactKind
                }, { abortEarly: false })
                .then(() => onValidate({
                    previousStatus,
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
    }))

    return (
        <>
            <Row gutters>
                <Col n="4">
                    <b>CHANGEMENT DE STATUT</b>
                </Col>
                <Col>
                    <span style={{
                        backgroundColor: `var(${getCampaignHousingState(previousStatus).bgcolor})`,
                        color: `var(${getCampaignHousingState(previousStatus).color})`,
                    }}
                          className='status-label'>
                        {getCampaignHousingState(previousStatus).title}
                    </span>
                    {previousStep &&
                        <span style={{
                            backgroundColor: `var(${getStep(previousStatus, previousStep)?.bgcolor})`,
                            color: `var(${getStep(previousStatus, previousStep)?.color})`,
                        }}
                              className='status-label'>
                            {previousStep}
                        </span>
                    }
                    {previousStep && previousPrecision &&
                        <span style={{
                            backgroundColor: `var(${getPrecision(previousStatus, previousStep, previousPrecision)?.bgcolor})`,
                            color: `var(${getPrecision(previousStatus, previousStep, previousPrecision)?.color})`,
                        }}
                              className='status-label'>
                            {previousPrecision}
                        </span>
                    }
                </Col>
            </Row>
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
                        label="Sous-statut"
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
                        label="Type d'interaction"
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
        </>
    );
};

export default React.forwardRef(CampaignHousingStatusForm);

