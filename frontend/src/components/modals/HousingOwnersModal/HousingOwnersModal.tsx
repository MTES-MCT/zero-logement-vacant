import React, { ChangeEvent, useState } from 'react';
import {
  Accordion,
  AccordionItem,
  Button,
  Col,
  Container,
  Icon,
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
import { getHousingOwnerRankLabel, HousingOwner } from '../../../models/Owner';

import * as yup from 'yup';
import { SelectOption } from '../../../models/SelectOption';
import { format } from 'date-fns';
import { dateValidator, emailValidator, useForm } from '../../../hooks/useForm';
import { parseDateInput } from '../../../utils/dateUtils';
import classNames from 'classnames';

interface Props {
  housingOwners: HousingOwner[];
  onSubmit: (owners: HousingOwner[]) => void;
  onClose: () => void;
}

const HousingOwnersModal = ({ housingOwners, onClose, onSubmit }: Props) => {
  type OwnerInput = Pick<
    HousingOwner,
    'id' | 'fullName' | 'rawAddress' | 'email' | 'phone'
  > & {
    rank: string;
    birthDate: string;
  };

  const [ownerInputs, setOwnerInputs] = useState<OwnerInput[]>(
    housingOwners.map((ho) => ({
      ...ho,
      rank: String(ho.endDate ? 0 : ho.rank),
      birthDate: ho?.birthDate ? format(ho.birthDate, 'yyyy-MM-dd') : '',
    }))
  );

  const ranks = Array.from(Array(housingOwners.length - 1).keys());

  const schema = yup.object().shape({
    ...ranks.reduce(
      (shape, currentRank) => ({
        ...shape,
        [`ownerRanks${currentRank + 2}`]: yup
          .array()
          .compact((ownerRank) => ownerRank.rank !== String(currentRank + 2))
          .max(1, `Il ne peut y avoir qu'un ${currentRank + 2}ème ayant-droit`),
      }),
      {}
    ),
    ...ownerInputs.reduce(
      (shape, ownerInput, index) => ({
        ...shape,
        [`fullName${index}`]: yup
          .string()
          .required('Veuillez renseigner un nom.'),
        [`email${index}`]: emailValidator.nullable().notRequired(),
        [`birthDate${index}`]: dateValidator,
      }),
      {}
    ),
    ownerRanks1: yup
      .array()
      .compact((ownerInput) => ownerInput.rank !== String(1))
      .min(1, 'Il doit y avoir au moins un propriétaire principal')
      .max(1, "Il ne peut y avoir qu'un propriétaire principal"),
  });

  const changeOwnerInputs = (ownerInput: OwnerInput) => {
    const newInputs = [...ownerInputs];
    newInputs.splice(
      ownerInputs.findIndex((_) => _.id === ownerInput.id),
      1,
      ownerInput
    );
    setOwnerInputs(newInputs);
  };

  const ownerRankOptions: SelectOption[] = [
    { value: '1', label: `Propriétaire principal` },
    ...ranks.map((_) => ({
      value: String(_ + 2),
      label: _ + 2 + 'ème ayant droit',
    })),
    { value: '0', label: `Ancien propriétaire` },
  ];

  const form = useForm(schema, {
    ...ranks.reduce(
      (inputs, currentRank) => ({
        ...inputs,
        [`ownerRanks${currentRank + 2}`]: ownerInputs,
      }),
      {}
    ),
    ...ownerInputs.reduce(
      (inputs, ownerInput, index) => ({
        ...inputs,
        [`fullName${index}`]: ownerInput.fullName,
        [`email${index}`]: ownerInput.email,
        [`birthDate${index}`]: ownerInput.birthDate,
      }),
      {}
    ),
    ownerRanks1: ownerInputs,
  });

  const submit = async () => {
    await form.validate(() => {
      onSubmit(
        housingOwners.map((ho) => ({
          ...ho,
          ...(ownerInputs
            .map((ownerInput) => ({
              ...ownerInput,
              rank: Number(ownerInput.rank),
              birthDate: parseDateInput(ownerInput.birthDate),
              endDate:
                ownerInput.rank === String(0)
                  ? ho.endDate ?? new Date()
                  : undefined,
            }))
            .find((_) => _.id === ho.id) ?? {}),
        }))
      );
    });
  };

  // @ts-ignore
  const message = (key: string) => form.message(key);
  // @ts-ignore
  const messageType = (key: string) => form.messageType(key);
  // @ts-ignore
  const hasError = (key: string) => form.hasError(key);

  return (
    <Modal isOpen={true} size="lg" hide={() => onClose()}>
      <ModalClose hide={() => onClose()} title="Fermer la fenêtre">
        Fermer
      </ModalClose>
      <ModalTitle>Modifier les propriétaires</ModalTitle>
      <ModalContent>
        <Accordion>
          {ownerInputs.map((ownerInput, index) => (
            <AccordionItem
              title={
                <div>
                  <span className="icon-xs">
                    <Icon name="ri-user-fill" iconPosition="center" size="xs" />
                  </span>
                  <Text as="span">
                    <b>{ownerInput.fullName}</b>
                  </Text>
                  <Text size="sm" className="zlv-label fr-ml-1w" as="span">
                    {getHousingOwnerRankLabel(Number(ownerInput.rank))}
                  </Text>
                </div>
              }
              id={index}
              key={ownerInput.id}
              className={classNames({
                error:
                  hasError(`fullName${index}`) ||
                  hasError(`birthDate${index}`) ||
                  hasError(`email${index}`),
              })}
            >
              <Select
                options={ownerRankOptions}
                selected={String(ownerInput.rank)}
                onChange={(e: any) =>
                  changeOwnerInputs({ ...ownerInput, rank: e.target.value })
                }
              />
              <Row gutters>
                <Col n="6">
                  <TextInput
                    value={ownerInput.fullName}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      changeOwnerInputs({
                        ...ownerInput,
                        fullName: e.target.value,
                      })
                    }
                    label="Nom prénom"
                    messageType={messageType(`fullName${index}`)}
                    message={message(`fullName${index}`)}
                    required
                  />
                </Col>
                <Col n="6">
                  <TextInput
                    value={ownerInput.birthDate}
                    type="date"
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      changeOwnerInputs({
                        ...ownerInput,
                        birthDate: e.target.value,
                      })
                    }
                    label="Date de naissance"
                    messageType={messageType(`birthDate${index}`)}
                    message={message(`birthDate${index}`)}
                  />
                </Col>
                <Col n="12">
                  <TextInput
                    textarea
                    value={ownerInput.rawAddress.join('\n')}
                    onChange={(e) =>
                      changeOwnerInputs({
                        ...ownerInput,
                        rawAddress: e.target.value.split('\n'),
                      })
                    }
                    label="Adresse postale"
                    messageType={messageType(`rawAddress${index}`)}
                    message={message(`rawAddress${index}`)}
                    rows={3}
                  />
                </Col>
                <Col n="6">
                  <TextInput
                    value={ownerInput.email}
                    type="text"
                    onChange={(e) =>
                      changeOwnerInputs({
                        ...ownerInput,
                        email: e.target.value,
                      })
                    }
                    label="Adresse mail"
                    messageType={messageType(`email${index}`)}
                    message={message(`email${index}`)}
                  />
                </Col>
                <Col n="6">
                  <TextInput
                    value={ownerInput.phone}
                    onChange={(e) =>
                      changeOwnerInputs({
                        ...ownerInput,
                        phone: e.target.value,
                      })
                    }
                    label="Numéro de téléphone"
                    messageType={messageType(`phone${index}`)}
                    message={message(`phone${index}`)}
                  />
                </Col>
              </Row>
            </AccordionItem>
          ))}
        </Accordion>
      </ModalContent>
      <ModalFooter>
        <Container as="section">
          {ranks
            .filter((rank) => hasError(`ownerRanks${rank}`))
            .map((rank) => (
              <p className="fr-error-text fr-mb-2w fr-mt-0" key={rank}>
                {message(`ownerRanks${rank}`)}
              </p>
            ))}
          <Row>
            <Col>
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
            </Col>
          </Row>
        </Container>
      </ModalFooter>
    </Modal>
  );
};

export default HousingOwnersModal;
