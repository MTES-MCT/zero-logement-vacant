import React, { ChangeEvent, useState } from 'react';
import {
    Accordion,
    AccordionItem,
    Button,
    Modal,
    ModalClose,
    ModalContent,
    ModalFooter,
    ModalTitle,
    TextInput,
} from '@dataesr/react-dsfr';
import { Owner } from '../../../models/Owner';

import * as yup from 'yup';
import { ValidationError } from 'yup/es';
import { format, isDate, parse } from 'date-fns';

const OwnerEditionModal = ({owner, onClose, onSubmit}: {owner: Owner, onSubmit: (owner: Owner) => void, onClose: () => void}) => {

    const [fullName, setFullName] = useState(owner.fullName ?? '');
    const [birthDate, setBirthDate] = useState(owner.birthDate ? format(owner.birthDate, 'dd/MM/yyyy') : '');
    const [rawAddress, setRawAddress] = useState<string[]>(owner.rawAddress);
    const [email, setEmail] = useState(owner.email);
    const [phone, setPhone] = useState(owner.phone);
    const [errors, setErrors] = useState<any>({});

    const ownerForm = yup.object().shape({
        fullName: yup.string().required('Veuillez renseigner un nom.'),
        email: yup.string().email('Veuillez renseigner un email valide.').nullable(),
        birthDate: yup
            .date()
            .nullable()
            .transform((curr, originalValue) => {
                return !originalValue.length ? null : (isDate(originalValue) ? originalValue : parse(originalValue, 'dd/MM/yyyy', new Date()))
            })
            .typeError('Veuillez renseigner une date valide.')
    });

    const submit = () => {
        ownerForm
            .validate({ fullName, birthDate, email, phone }, {abortEarly: false})
            .then(() => {
                onSubmit({
                    ...owner,
                    fullName,
                    birthDate: birthDate.length ? parse(birthDate, 'dd/MM/yyyy', new Date()) : undefined,
                    rawAddress,
                    email,
                    phone
                });
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

    return (
        <Modal isOpen={true}
               hide={() => onClose()}
               data-testid="campaign-creation-modal">
            <ModalClose hide={() => onClose()} title="Fermer la fenêtre">Fermer</ModalClose>
            <ModalTitle>Modifier la rubrique &rdquo;propriétaire&rdquo;</ModalTitle>
            <ModalContent>
                <Accordion className="custom-class">
                    <AccordionItem title="Identité" initExpand={true}>
                        <TextInput
                            value={fullName}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
                            label="Nom"
                            messageType={errors['fullName'] ? 'error' : ''}
                            message={errors['fullName']}
                            required
                        />
                        <TextInput
                            value={birthDate}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setBirthDate(e.target.value)}
                            label="Date de naissance"
                            messageType={errors['birthDate'] ? 'error' : ''}
                            message={errors['birthDate']}
                        />
                    </AccordionItem>
                    <AccordionItem title="Coordonnées">
                        <TextInput
                            textarea
                            value={rawAddress.reduce((a1, a2) => `${a1}\n${a2}`)}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setRawAddress(e.target.value.split('\n'))}
                            label="Adresse postale"
                            messageType={errors['address'] ? 'error' : ''}
                            message={errors['address']}
                            rows="3"
                        />
                        <TextInput
                            value={email}
                            type="email"
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                            label="Adresse mail"
                            messageType={errors['email'] ? 'error' : ''}
                            message={errors['email']}
                        />
                        <TextInput
                            value={phone}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
                            label="Numéro de téléphone"
                            messageType={errors['phone'] ? 'error' : ''}
                            message={errors['phone']}
                        />
                    </AccordionItem>
                </Accordion>
            </ModalContent>
            <ModalFooter>
                <Button title="title"
                        secondary
                        className="fr-mr-2w"
                        onClick={() => onClose()}>
                    Annuler
                </Button>
                <Button title="title"
                        onClick={() => submit()}
                        data-testid="create-button">
                    Enregistrer
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default OwnerEditionModal;

