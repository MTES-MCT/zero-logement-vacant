import React, { ChangeEvent, useEffect, useImperativeHandle, useState } from 'react';
import { Col, Row, Select, Text, TextInput } from '@dataesr/react-dsfr';
import { HousingUpdate } from '../../../models/Housing';
import {
    getHousingState,
    getPrecision,
    getStatusPrecisionOptions,
    getSubStatus,
    getSubStatusOptions,
    HousingStates,
    HousingStatus,
} from '../../../models/HousingState';
import { DefaultOption, SelectOption } from '../../../models/SelectOption';

import * as yup from 'yup';
import { ValidationError } from 'yup/es';

const HousingStatusForm = (
    {
        previousStatus,
        previousSubStatus,
        previousPrecision,
        onValidate,
    }: {
        previousStatus?: HousingStatus,
        previousSubStatus?: string,
        previousPrecision?: string,
        onValidate: (housingUpdate: HousingUpdate) => void
    }, ref: any) => {

    const [status, setStatus] = useState<HousingStatus>();
    const [subStatus, setSubStatus] = useState<string | undefined>(previousSubStatus);
    const [precision, setPrecision] = useState<string | undefined>(previousPrecision);
    const [subStatusOptions, setSubStatusOptions] = useState<SelectOption[]>();
    const [precisionOptions, setPrecisionOptions] = useState<SelectOption[]>();
    const [contactKind, setContactKind] = useState<string>()
    const [comment, setComment] = useState<string>()
    const [formErrors, setFormErrors] = useState<any>({});


    useEffect(() => {
        selectStatus(previousStatus ?? HousingStatus.Waiting)
    }, [previousStatus])

    const statusOptions = [
        DefaultOption,
        ...HousingStates.filter(_ => _.status).map(status => (
            {value: String(status.status), label: status.title}
        ))
    ]

    const selectStatus = (newStatus: HousingStatus) => {
        setStatus(newStatus);
        setSubStatusOptions(getSubStatusOptions(newStatus));
        selectSubStatus(getSubStatusOptions(newStatus)?.map(_ => _.label).find(_ => _ === subStatus));
    }

    const selectSubStatus = (newSubStatus?: string) => {
        setSubStatus(newSubStatus);
        if (newSubStatus && status) {
            setPrecisionOptions(getStatusPrecisionOptions(status, newSubStatus));
            setPrecision(getStatusPrecisionOptions(status, newSubStatus)?.map(_ => _.label).find(_ => _ === precision));
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
        subStatus: yup.string().nullable().when('hasSubStatus', {
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
                    hasSubStatus: subStatusOptions !== undefined,
                    hasPrecisions: precisionOptions !== undefined,
                    status,
                    subStatus,
                    precision,
                    contactKind
                }, { abortEarly: false })
                .then(() => onValidate({
                    status: +(status ?? HousingStatus.Waiting),
                    subStatus: subStatus,
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
                    {previousStatus &&
                        <span style={{
                            backgroundColor: `var(${getHousingState(previousStatus).bgcolor})`,
                            color: `var(${getHousingState(previousStatus).color})`,
                        }}
                              className='status-label'>
                            {getHousingState(previousStatus).title}
                        </span>
                    }
                    {previousStatus && previousSubStatus &&
                        <span style={{
                            backgroundColor: `var(${getSubStatus(previousStatus, previousSubStatus)?.bgcolor})`,
                            color: `var(${getSubStatus(previousStatus, previousSubStatus)?.color})`,
                        }}
                              className='status-label'>
                            {previousSubStatus}
                        </span>
                    }
                    {previousStatus && previousSubStatus && previousPrecision &&
                        <span style={{
                            backgroundColor: `var(${getPrecision(previousStatus, previousSubStatus, previousPrecision)?.bgcolor})`,
                            color: `var(${getPrecision(previousStatus, previousSubStatus, previousPrecision)?.color})`,
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
                    {subStatusOptions &&
                    <Select
                        label="Sous-statut"
                        options={subStatusOptions}
                        selected={subStatus}
                        messageType={formErrors['subStatus'] ? 'error' : undefined}
                        message={formErrors['subStatus']}
                        onChange={(e: any) => selectSubStatus(e.target.value)}/>
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
                <b>INFORMATIONS COMPLÉMENTAIRES</b>
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

export default React.forwardRef(HousingStatusForm);

