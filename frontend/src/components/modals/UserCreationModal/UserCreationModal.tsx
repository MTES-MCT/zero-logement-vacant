import React, { ChangeEvent, useEffect, useState } from 'react';
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
    TextInput,
} from '@dataesr/react-dsfr';

import * as yup from 'yup';
import { ValidationError } from 'yup/es';
import { DraftUser, UserRoles } from '../../../models/User';
import { Establishment } from '../../../models/Establishment';

const UserCreationModal = ({availableEstablishments, onSubmit, onClose}: {availableEstablishments: Establishment[], onSubmit: (draftUser: DraftUser) => void, onClose: () => void}) => {

    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [requestNumber, setRequestNumber] = useState('');
    const [establishmentId, setEstablishmentId] = useState<string>('');
    const [availableEstablishmentOptions, setAvailableEstablishmentOptions] = useState<{ value: string, label: string, disabled?: boolean }[] | undefined>();

    const [formErrors, setFormErrors] = useState<any>({});

    useEffect(() => {
        if (availableEstablishments) {
            setAvailableEstablishmentOptions([
                { value: '', label: 'Sélectionner un établissement', disabled: true },
                ...availableEstablishments.map(e => ({
                    value: e.id,
                    label: e.name
                }))
            ])
        }
    }, [availableEstablishments])

    const userForm = yup.object().shape({
        email: yup.string().required('Veuillez renseigner un email.').email('Veuillez renseigner un email valide.'),
        firstName: yup.string().required('Veuillez renseigner un prénom.'),
        lastName: yup.string().required('Veuillez renseigner un nom.'),
        establishmentId: yup.string().min(1, 'Veuillez sélectionner un établissement.')
    });

    const submitUserForm = () => {
        setFormErrors({});
        userForm
            .validate({email, firstName, lastName, requestNumber, establishmentId }, {abortEarly: false})
            .then(() => onSubmit({
                email,
                firstName,
                lastName,
                requestNumber,
                role: UserRoles.Usual,
                establishmentId
            } as DraftUser))
            .catch(err => {
                const object: any = {};
                err.inner.forEach((x: ValidationError) => {
                    if (x.path !== undefined && x.errors.length) {
                        object[x.path] = x.errors[0];
                    }
                });
                setFormErrors(object);
            })
    };

    return (
        <Modal isOpen={true}
               hide={() => onClose()}>
            <ModalClose hide={() => onClose()} title="Fermer la fenêtre">Fermer</ModalClose>
            <ModalTitle>
                <span className="ri-1x icon-left ri-arrow-right-line ds-fr--v-middle" />
                Créer un utilisateur
            </ModalTitle>
            <ModalContent>
                <Container fluid>
                    <form id="user_form">
                        <Row gutters>
                            <Col>
                                <TextInput
                                    value={firstName}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
                                    messageType={formErrors['firstName'] ? 'error' : ''}
                                    message={formErrors['firstName']}
                                    label="Prénom : "
                                    required
                                />
                            </Col>
                            <Col>
                                <TextInput
                                    value={lastName}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)}
                                    messageType={formErrors['lastName'] ? 'error' : ''}
                                    message={formErrors['lastName']}
                                    label="Nom : "
                                    required
                                />
                            </Col>
                        </Row>
                        <Row gutters>
                            <Col>
                                <TextInput
                                    value={email}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                    messageType={formErrors['email'] ? 'error' : ''}
                                    message={formErrors['email']}
                                    label="Adresse email : "
                                    required
                                />
                            </Col>
                        </Row>
                        <Row gutters>
                            <Col>
                                {availableEstablishmentOptions?.length &&
                                    <Select
                                        label="Etablissement"
                                        selected={establishmentId}
                                        options={availableEstablishmentOptions}
                                        messageType={formErrors['establishmentId'] ? 'error' : undefined}
                                        message={formErrors['establishmentId']}
                                        onChange={(e: any) => setEstablishmentId(e.target.value)}
                                        required
                                    />
                                }
                            </Col>
                            <Col>
                                <TextInput
                                    value={requestNumber}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setRequestNumber(e.target.value)}
                                    messageType={formErrors['requestNumber'] ? 'error' : ''}
                                    message={formErrors['requestNumber']}
                                    label="Numéro de dossier : "
                                />
                            </Col>
                        </Row>
                    </form>
                </Container>
            </ModalContent>
            <ModalFooter>
                <Button title="Annuler"
                        secondary
                        className="fr-mr-2w"
                        onClick={() => onClose()}>
                    Annuler
                </Button>
                <Button title="Ajouter"
                        onClick={() => submitUserForm()}>
                    Ajouter
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default UserCreationModal;

