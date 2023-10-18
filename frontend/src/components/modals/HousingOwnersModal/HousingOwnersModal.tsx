import React, { useEffect, useMemo, useState } from 'react';
import { Col, Container, Icon, Row, Text } from '../../_dsfr';
import { getHousingOwnerRankLabel, HousingOwner } from '../../../models/Owner';

import * as yup from 'yup';
import { SelectOption } from '../../../models/SelectOption';
import { format } from 'date-fns';
import { dateValidator, emailValidator, useForm } from '../../../hooks/useForm';
import { parseDateInput } from '../../../utils/dateUtils';
import classNames from 'classnames';
import HousingAdditionalOwner from './HousingAdditionalOwner';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import Button from '@codegouvfr/react-dsfr/Button';
import { fr } from '@codegouvfr/react-dsfr';
import Accordion from '@codegouvfr/react-dsfr/Accordion';
import AppSelect from '../../_app/AppSelect/AppSelect';
import AppTextInput from '../../_app/AppTextInput/AppTextInput';
import { useIsModalOpen } from '@codegouvfr/react-dsfr/Modal/useIsModalOpen';

interface Props {
  housingId: string;
  housingOwners: HousingOwner[];
  onSubmit: (owners: HousingOwner[]) => Promise<void>;
}

const HousingOwnersModal = ({
  housingId,
  housingOwners: initialHousingOwners,
  onSubmit,
}: Props) => {
  type OwnerInput = Pick<
    HousingOwner,
    'id' | 'fullName' | 'rawAddress' | 'email' | 'phone'
  > & {
    rank: string;
    birthDate: string;
  };

  const modal = useMemo(
    () =>
      createModal({
        id: `housing-owners-modal-${housingId}`,
        isOpenedByDefault: false,
      }),
    [housingId]
  );

  const isOpen = useIsModalOpen(modal);

  useEffect(() => {
    if (!isOpen) {
      setModalMode('list');
      setHousingOwners(initialHousingOwners);
    }
  }, [isOpen]); //eslint-disable-line react-hooks/exhaustive-deps

  const [modalMode, setModalMode] = useState<'list' | 'add'>('list');
  const [housingOwners, setHousingOwners] =
    useState<HousingOwner[]>(initialHousingOwners);

  const getOwnerInput = (housingOwner: HousingOwner) => ({
    ...housingOwner,
    rank: String(housingOwner.endDate ? 0 : housingOwner.rank),
    birthDate: housingOwner?.birthDate
      ? format(housingOwner.birthDate, 'yyyy-MM-dd')
      : '',
  });

  const [ownerInputs, setOwnerInputs] = useState<OwnerInput[]>(
    housingOwners.map(getOwnerInput)
  );

  const ranks =
    ownerInputs.length > 0
      ? Array.from(Array(ownerInputs.length - 1).keys()).map((_) => _ + 1)
      : [];

  const shape = {
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
  };
  type FormShape = typeof shape;

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
    yup.object().shape(shape),
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

  const onAddOwner = (housingOwner: HousingOwner) => {
    setHousingOwners([...housingOwners, housingOwner]);
    setOwnerInputs([...ownerInputs, getOwnerInput(housingOwner)]);
    setModalMode('list');
  };

  const submit = async () => {
    await form.validate(async () => {
      await onSubmit(
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
      modal.close();
    });
  };

  // @ts-ignore
  const message = (key: string) => form.message(key);
  // @ts-ignore
  const hasError = (key: string) => form.hasError(key);

  return (
    <>
      <Button
        className="float-right"
        iconId="fr-icon-edit-fill"
        priority="tertiary no outline"
        title="Modifier le propriétaire"
        onClick={modal.open}
      >
        Modifier
      </Button>
      <modal.Component
        size="large"
        title={
          modalMode === 'list'
            ? 'Modifier les propriétaires'
            : "Ajout d'un nouveau propriétaire"
        }
        buttons={
          modalMode === 'list'
            ? [
                {
                  children: 'Annuler',
                  priority: 'secondary',
                  onClick: () => setHousingOwners(initialHousingOwners),
                },
                {
                  children: 'Enregistrer',
                  onClick: submit,
                  doClosesModal: false,
                },
              ]
            : [
                {
                  children: 'Retour',
                  priority: 'secondary',
                  doClosesModal: false,
                  onClick: () => setModalMode('list'),
                },
              ]
        }
        style={{ textAlign: 'initial', fontWeight: 'initial' }}
      >
        {modalMode === 'list' ? (
          <>
            <div className={fr.cx('fr-accordions-group')}>
              {ownerInputs.map((ownerInput, index) => (
                <Accordion
                  label={
                    <div>
                      <span className="icon-xs">
                        <Icon
                          name="fr-icon-user-fill"
                          iconPosition="center"
                          size="xs"
                        />
                      </span>
                      <Text as="span">
                        <b>{ownerInput.fullName}</b>
                      </Text>
                      <Text size="sm" className="zlv-label fr-ml-1w" as="span">
                        {getHousingOwnerRankLabel(Number(ownerInput.rank))}
                      </Text>
                    </div>
                  }
                  id={String(index)}
                  key={ownerInput.id}
                  className={classNames({
                    error:
                      hasError(`fullName${index}`) ||
                      hasError(`birthDate${index}`) ||
                      hasError(`email${index}`),
                  })}
                >
                  <AppSelect<FormShape>
                    onChange={(e) =>
                      changeOwnerInputs({
                        ...ownerInput,
                        rank: e.target.value,
                      })
                    }
                    value={String(ownerInput.rank)}
                    inputForm={form}
                    inputKey="ownerRanks"
                    options={ownerRankOptions}
                  />
                  <Row gutters>
                    <Col n="6">
                      <AppTextInput<FormShape>
                        value={ownerInput.fullName}
                        onChange={(e) =>
                          changeOwnerInputs({
                            ...ownerInput,
                            fullName: e.target.value,
                          })
                        }
                        required
                        label="Nom prénom"
                        inputForm={form}
                        // @ts-ignore
                        inputKey={`fullName${index}`}
                      />
                    </Col>
                    <Col n="6">
                      <AppTextInput<FormShape>
                        type={'date'}
                        value={ownerInput.birthDate}
                        onChange={(e) =>
                          changeOwnerInputs({
                            ...ownerInput,
                            birthDate: e.target.value,
                          })
                        }
                        label="Date de naissance"
                        inputForm={form}
                        // @ts-ignore
                        inputKey={`birthDate$${index}`}
                      />
                    </Col>
                    <Col n="12">
                      <AppTextInput<FormShape>
                        textArea
                        rows={3}
                        value={ownerInput.rawAddress.join('\n')}
                        onChange={(e) =>
                          changeOwnerInputs({
                            ...ownerInput,
                            rawAddress: e.target.value.split('\n'),
                          })
                        }
                        label="Adresse postale"
                        inputForm={form}
                        // @ts-ignore
                        inputKey={`rawAddress$${index}`}
                      />
                    </Col>
                    <Col n="6">
                      <AppTextInput<FormShape>
                        type={'email'}
                        value={ownerInput.email}
                        onChange={(e) =>
                          changeOwnerInputs({
                            ...ownerInput,
                            email: e.target.value,
                          })
                        }
                        label="Adresse mail"
                        inputForm={form}
                        // @ts-ignore
                        inputKey={`email$${index}`}
                      />
                    </Col>
                    <Col n="6">
                      <AppTextInput<FormShape>
                        value={ownerInput.phone}
                        onChange={(e) =>
                          changeOwnerInputs({
                            ...ownerInput,
                            phone: e.target.value,
                          })
                        }
                        label="Numéro de téléphone"
                        inputForm={form}
                        // @ts-ignore
                        inputKey={`phone$${index}`}
                      />
                    </Col>
                  </Row>
                </Accordion>
              ))}
            </div>
            <Container as="section" spacing="p-0">
              {hasError('ownerRanks') && (
                <p className="fr-error-text fr-mb-2w fr-mt-0">
                  {message('ownerRanks')}
                </p>
              )}
              <Row gutters spacing="mt-2w">
                <Col className="align-right">
                  <Button
                    priority="secondary"
                    iconId="fr-icon-add-line"
                    title="Ajouter un propriétaire"
                    onClick={() => setModalMode('add')}
                  >
                    Ajouter un propriétaire
                  </Button>
                </Col>
              </Row>
            </Container>
          </>
        ) : (
          <HousingAdditionalOwner
            housingId={housingId}
            activeOwnersCount={housingOwners.filter((_) => _.rank).length}
            onAddOwner={onAddOwner}
          />
        )}
      </modal.Component>
    </>
  );
};

export default HousingOwnersModal;
