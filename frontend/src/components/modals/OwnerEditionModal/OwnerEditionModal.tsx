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
} from '@dataesr/react-dsfr';
import { Owner } from '../../../models/Owner';

import * as yup from 'yup';
import { format } from 'date-fns';
import styles from './owner-edition-modal.module.scss';
import { parseDateInput } from '../../../utils/dateUtils';
import { dateValidator, emailValidator, useForm } from '../../../hooks/useForm';
import AppTextInput from '../../AppTextInput/AppTextInput';

const OwnerEditionModal = ({
  owner,
  onClose,
  onUpdate,
}: {
  owner: Owner;
  onUpdate: (owner: Owner) => void;
  onClose: () => void;
}) => {
  const [fullName, setFullName] = useState(owner?.fullName ?? '');
  const [birthDate, setBirthDate] = useState(
    owner?.birthDate ? format(owner.birthDate, 'yyyy-MM-dd') : ''
  );
  const [rawAddress, setRawAddress] = useState<string[]>(
    owner?.rawAddress ?? []
  );
  const [email, setEmail] = useState(owner?.email);
  const [phone, setPhone] = useState(owner?.phone);

  const shape = {
    fullName: yup.string().required("Veuillez saisir l'identité"),
    birthDate: dateValidator,
    rawAddress: yup.array().nullable(),
    email: emailValidator.notRequired(),
    phone: yup.string().nullable(),
  };
  type FormShape = typeof shape;

  const form = useForm(yup.object().shape(shape), {
    fullName,
    birthDate,
    rawAddress,
    email,
    phone,
  });

  const submit = async () => {
    await form.validate(() => {
      if (owner) {
        onUpdate({
          ...owner,
          fullName,
          birthDate: parseDateInput(birthDate),
          rawAddress,
          email,
          phone,
        });
      }
    });
  };

  return (
    <Modal isOpen={true} hide={() => onClose()}>
      <ModalClose hide={() => onClose()} title="Fermer la fenêtre">
        Fermer
      </ModalClose>
      <ModalTitle>
        {owner
          ? 'Modifier la rubrique "propriétaire"'
          : 'Créer un nouveau propriétaire'}
      </ModalTitle>
      <ModalContent>
        <Accordion>
          <AccordionItem
            title="Identité"
            initExpand={true}
            className={
              form.hasError('fullName') || form.hasError('birthDate')
                ? styles.itemError
                : undefined
            }
          >
            <AppTextInput<FormShape>
              value={fullName}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFullName(e.target.value)
              }
              label="Identité (nom, prénom) (obligatoire)"
              inputForm={form}
              inputKey="fullName"
              required
            />
            <AppTextInput<FormShape>
              value={birthDate}
              type="date"
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setBirthDate(e.target.value)
              }
              label="Date de naissance"
              inputForm={form}
              inputKey="birthDate"
            />
          </AccordionItem>
          <AccordionItem
            title="Coordonnées"
            className={
              form.hasError('rawAddress') ||
              form.hasError('email') ||
              form.hasError('phone')
                ? styles.itemError
                : undefined
            }
          >
            <AppTextInput<FormShape>
              textarea
              value={rawAddress.join('\n')}
              onChange={(e) => setRawAddress(e.target.value.split('\n'))}
              label="Adresse postale"
              inputForm={form}
              inputKey="rawAddress"
              rows={3}
            />
            <AppTextInput<FormShape>
              value={email}
              type="text"
              onChange={(e) => setEmail(e.target.value)}
              label="Adresse mail"
              inputForm={form}
              inputKey="email"
            />
            <AppTextInput<FormShape>
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              label="Numéro de téléphone"
              inputForm={form}
              inputKey="phone"
            />
          </AccordionItem>
        </Accordion>
      </ModalContent>
      <ModalFooter>
        <Button
          title="Annuler"
          secondary
          className="fr-mr-2w"
          onClick={() => onClose()}
        >
          Annuler
        </Button>
        <Button
          title="Enregistrer"
          onClick={() => submit()}
          data-testid="create-button"
        >
          Enregistrer
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default OwnerEditionModal;
