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
import { DraftOwner, Owner } from '../../../models/Owner';

import * as yup from 'yup';
import { ValidationError } from 'yup/es';
import { format, isDate, parse } from 'date-fns';
import styles from './owner-edition-modal.module.scss';

const OwnerEditionModal = (
    {
        owner,
        onClose,
        onCreate,
        onUpdate
    }: {
        owner?: Owner,
        onCreate?: (owner: DraftOwner) => void,
        onUpdate?: (owner: Owner) => void,
        onClose: () => void
    }) => {

    const [fullName, setFullName] = useState(owner?.fullName ?? '');
    const [birthDate, setBirthDate] = useState(owner?.birthDate ? format(owner.birthDate, 'yyyy-MM-dd') : '');
    const [rawAddress, setRawAddress] = useState<string[]>(owner?.rawAddress ?? []);
    const [email, setEmail] = useState(owner?.email);
    const [phone, setPhone] = useState(owner?.phone);
    const [errors, setErrors] = useState<any>({});

    const ownerForm = yup.object().shape({
        fullName: yup.string().required('Veuillez renseigner un nom.'),
        email: yup.string().email('Veuillez renseigner un email valide.').nullable(),
        birthDate: yup
            .date()
            .nullable()
            .transform((curr, originalValue) => {
                return !originalValue.length ? null : (isDate(originalValue) ? originalValue : parse(originalValue, 'yyyy-MM-dd', new Date()))
            })
            .typeError('Veuillez renseigner une date valide.')
    });

    const submit = () => {
        ownerForm
            .validate({ fullName, birthDate, email, phone }, {abortEarly: false})
            .then(() => {
                if (owner && onUpdate) {
                    onUpdate({
                        ...owner,
                        fullName,
                        birthDate: birthDate.length ? parse(birthDate, 'yyyy-MM-dd', new Date()) : undefined,
                        rawAddress,
                        email,
                        phone
                    });
                } else if (onCreate) {
                    onCreate({
                        fullName,
                        birthDate: birthDate.length ? parse(birthDate, 'yyyy-MM-dd', new Date()) : undefined,
                        rawAddress,
                        email,
                        phone
                    })
                }
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
            <ModalTitle>{owner ? 'Modifier la rubrique "propriétaire"' : 'Créer un nouveau propriétaire'}</ModalTitle>
            <ModalContent>
                <Accordion>
                    <AccordionItem title="Identité" initExpand={true} className={errors['fullName'] || errors['birthDate'] ? styles.itemError : undefined}>
                        <TextInput
                            value={fullName}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
                            label="Nom prénom"
                            messageType={errors['fullName'] ? 'error' : ''}
                            message={errors['fullName']}
                            required
                        />
                        <TextInput
                            value={birthDate}
                            type="date"
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setBirthDate(e.target.value)}
                            label="Date de naissance"
                            messageType={errors['birthDate'] ? 'error' : ''}
                            message={errors['birthDate']}
                        />
                    </AccordionItem>
                    <AccordionItem title="Coordonnées" className={errors['address'] || errors['email'] || errors['phone'] ? styles.itemError : undefined}>
                        <TextInput
                            textarea
                            value={rawAddress.join('\n')}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setRawAddress(e.target.value.split('\n'))}
                            label="Adresse postale"
                            messageType={errors['address'] ? 'error' : ''}
                            message={errors['address']}
                            rows="3"
                        />
                        <TextInput
                            value={email}
                            type="text"
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
                <Button title="Annuler"
                        secondary
                        className="fr-mr-2w"
                        onClick={() => onClose()}>
                    Annuler
                </Button>
                <Button title="Enregistrer"
                        onClick={() => submit()}
                        data-testid="create-button">
                    Enregistrer
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default OwnerEditionModal;

