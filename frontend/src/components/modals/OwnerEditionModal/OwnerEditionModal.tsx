import React, { ChangeEvent, useState } from 'react';
import { Button, Modal, ModalClose, ModalContent, ModalFooter, ModalTitle, TextInput } from '@dataesr/react-dsfr';
import { Owner } from '../../../models/Owner';

import * as yup from 'yup';
import { ValidationError } from 'yup/es';

const OwnerEditionModal = ({owner, onClose, onSubmit}: {owner: Owner, onSubmit: (owner: Owner) => void, onClose: () => void}) => {

    const [email, setEmail] = useState(owner.email ?? '');
    const [errors, setErrors] = useState<any>({});
    const [phone, setPhone] = useState(owner.phone);

    const ownerForm = yup.object().shape({
        email: yup.string().email('Veuillez renseigner un email valide.')
    });

    const submit = () => {
        ownerForm
            .validate({ email, phone }, {abortEarly: false})
            .then(() => {
                onSubmit({
                    ...owner,
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
            <ModalTitle>Modifier le propriétaire</ModalTitle>
            <ModalContent>
                <TextInput
                    value={email}
                    type="email"
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    label="Email"
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

