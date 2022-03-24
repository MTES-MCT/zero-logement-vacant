import React, { ChangeEvent, useEffect, useImperativeHandle, useState } from 'react';
import { Col, Row, Select, Text, TextInput } from '@dataesr/react-dsfr';
import { HousingUpdate } from '../../../models/Housing';
import {
    getHousingState,
    getPrecision,
    getStatusPrecisionOptions,
    getSubStatus,
    getSubStatusOptions,
    HousingStatus,
} from '../../../models/HousingState';
import { DefaultOption, SelectOption } from '../../../models/SelectOption';

import * as yup from 'yup';
import { ValidationError } from 'yup/es';
import AppMultiSelect from '../../AppMultiSelect/AppMultiSelect';
import { statusOptions, vacancyReasonsOptions } from '../../../models/HousingFilters';

const HousingStatusForm = (
    {
        currentStatus,
        currentSubStatus,
        currentPrecision,
        currentVacancyReasons,
        onValidate,
    }: {
        currentStatus?: HousingStatus,
        currentSubStatus?: string,
        currentPrecision?: string,
        currentVacancyReasons?: string[],
        onValidate: (housingUpdate: HousingUpdate) => void
    }, ref: any) => {

    const [status, setStatus] = useState<HousingStatus>();
    const [subStatus, setSubStatus] = useState<string | undefined>(currentSubStatus);
    const [precision, setPrecision] = useState<string | undefined>(currentPrecision);
    const [vacancyReasons, setVacancyReasons] = useState<string[] | undefined>(currentVacancyReasons);
    const [subStatusOptions, setSubStatusOptions] = useState<SelectOption[]>();
    const [precisionOptions, setPrecisionOptions] = useState<SelectOption[]>();
    const [contactKind, setContactKind] = useState<string>()
    const [comment, setComment] = useState<string>()
    const [formErrors, setFormErrors] = useState<any>({});


    useEffect(() => {selectStatus(currentStatus ?? HousingStatus.Waiting)}, [currentStatus])
    useEffect(() => {selectSubStatus(currentStatus, currentSubStatus)}, [currentStatus, currentSubStatus])
    useEffect(() => {setPrecision(currentPrecision)}, [currentPrecision])
    useEffect(() => {setVacancyReasons(currentVacancyReasons)}, [currentVacancyReasons])

    const selectStatus = (newStatus: HousingStatus) => {
        setStatus(newStatus);
        setSubStatusOptions(getSubStatusOptions(newStatus));
        selectSubStatus(newStatus, getSubStatusOptions(newStatus)?.map(_ => _.label).find(_ => _ === subStatus));
    }

    const selectSubStatus = (status?: HousingStatus, newSubStatus?: string) => {
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
                    vacancyReasons,
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
                    {currentStatus &&
                        <span style={{
                            backgroundColor: `var(${getHousingState(currentStatus).bgcolor})`,
                            color: `var(${getHousingState(currentStatus).color})`,
                        }}
                              className='status-label'>
                            {getHousingState(currentStatus).title}
                        </span>
                    }
                    {currentStatus && currentSubStatus &&
                        <span style={{
                            backgroundColor: `var(${getSubStatus(currentStatus, currentSubStatus)?.bgcolor})`,
                            color: `var(${getSubStatus(currentStatus, currentSubStatus)?.color})`,
                        }}
                              className='status-label'>
                            {currentSubStatus}
                        </span>
                    }
                    {currentStatus && currentSubStatus && currentPrecision &&
                        <span style={{
                            backgroundColor: `var(${getPrecision(currentStatus, currentSubStatus, currentPrecision)?.bgcolor})`,
                            color: `var(${getPrecision(currentStatus, currentSubStatus, currentPrecision)?.color})`,
                        }}
                              className='status-label'>
                            {currentPrecision}
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
                        onChange={(e: any) => selectSubStatus(status, e.target.value)}/>
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
                <Col n="8">
                    <AppMultiSelect label="Cause(s) de la vacance"
                                    defaultOption="Aucune"
                                    options={vacancyReasonsOptions}
                                    initialValues={vacancyReasons}
                                    onChange={(values) => setVacancyReasons(values)}/>
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

