import React, { ChangeEvent, useEffect, useState } from 'react';
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
import styles from '../OwnerEditionModal/owner-edition-modal.module.scss';
import HousingAdditionalOwnerModal from '../HousingAdditionnalOwnerModal/HousingAdditionalOwnerModal';

interface Props {
  housingId: string;
  housingOwners: HousingOwner[];
  onSubmit: (owners: HousingOwner[]) => void;
  onClose: () => void;
}

const HousingOwnersModal = ({
  housingId,
  housingOwners: initialHousingOwners,
  onClose,
  onSubmit,
}: Props) => {
  const [isModalAdditionalOwnerOpen, setIsModalAdditionalOwnerOpen] =
    useState(false);

  type OwnerInput = Pick<
    HousingOwner,
    'id' | 'fullName' | 'rawAddress' | 'email' | 'phone'
  > & {
    rank: string;
    birthDate: string;
  };

  const [housingOwners, setHousingOwners] =
    useState<HousingOwner[]>(initialHousingOwners);

  const [ownerInputs, setOwnerInputs] = useState<OwnerInput[]>([]);

  useEffect(
    () =>
      setOwnerInputs(
        housingOwners.map((housingOwner: HousingOwner) => ({
          ...housingOwner,
          rank: String(housingOwner.endDate ? 0 : housingOwner.rank),
          birthDate: housingOwner?.birthDate
            ? format(housingOwner.birthDate, 'yyyy-MM-dd')
            : '',
        }))
      ),
    [housingOwners]
  );

  const ranks =
    ownerInputs.length > 0
      ? Array.from(Array(ownerInputs.length - 1).keys()).map((_) => _ + 1)
      : [];

  const schema = yup.object().shape({
    ...ownerInputs.reduce(
      (shape, ownerInput, index) => ({
        ...shape,
        [`fullName${index}`]: yup
          .string()
          .required('Veuillez renseigner un nom.'),
        [`email${index}`]: emailValidator.nullable().notRequired(),
        [`birthDate${index}`]: dateValidator.nullable().notRequired(),
      }),
      {}
    ),
    ownerRanks: yup.array().test({
      test(array, ctx) {
        if ((array ?? []).filter((_) => _.rank === '1').length < 1) {
          return ctx.createError({
            message: 'Il doit y avoir au moins un propriétaire principal',
          });
        }
        if ((array ?? []).filter((_) => _.rank === '1').length > 1) {
          return ctx.createError({
            message: "Il ne peut y avoir qu'un propriétaire principal",
          });
        }
        for (const rank of ranks) {
          if (
            (array ?? []).filter((_) => _.rank === String(rank + 1)).length > 1
          ) {
            return ctx.createError({
              message: `Il ne peut y avoir qu'un ${rank + 1}ème ayant-droit`,
            });
          }
        }
        return true;
      },
    }),
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
      value: String(_ + 1),
      label: _ + 1 + 'ème ayant droit',
    })),
    { value: '0', label: `Ancien propriétaire` },
  ];

  const form = useForm(
    schema,
    {
      ...ownerInputs.reduce(
        (inputs, ownerInput, index) => ({
          ...inputs,
          [`fullName${index}`]: ownerInput.fullName,
          [`email${index}`]: ownerInput.email,
          [`birthDate${index}`]: ownerInput.birthDate,
        }),
        {}
      ),
      ownerRanks: ownerInputs,
    },
    ['ownerRanks']
  );

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
        <Container as="section" spacing="p-0">
          {hasError('ownerRanks') && (
            <p className="fr-error-text fr-mb-2w fr-mt-0">
              {message('ownerRanks')}
            </p>
          )}
          <Row gutters>
            <Col n="12" className="align-right">
              <hr />
              <Button
                className={styles.addButton}
                secondary
                icon="ri-add-fill"
                title="Ajouter un propriétaire"
                onClick={() => setIsModalAdditionalOwnerOpen(true)}
              >
                Ajouter un propriétaire
              </Button>
              {isModalAdditionalOwnerOpen && (
                <HousingAdditionalOwnerModal
                  housingId={housingId}
                  activeOwnersCount={housingOwners.filter((_) => _.rank).length}
                  onAddOwner={(housingOwner) =>
                    setHousingOwners([...housingOwners, housingOwner])
                  }
                  onClose={() => setIsModalAdditionalOwnerOpen(false)}
                />
              )}
            </Col>
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
