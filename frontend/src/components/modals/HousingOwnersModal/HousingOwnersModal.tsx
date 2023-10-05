import React, { useState } from 'react';
import {
  Col,
  Container,
  Icon,
  Row,
  Text,
} from '../../../components/dsfr/index';
import { getHousingOwnerRankLabel, HousingOwner } from '../../../models/Owner';

import * as yup from 'yup';
import { SelectOption } from '../../../models/SelectOption';
import { format } from 'date-fns';
import { dateValidator, emailValidator, useForm } from '../../../hooks/useForm';
import { parseDateInput } from '../../../utils/dateUtils';
import classNames from 'classnames';
import HousingAdditionalOwnerModal from '../HousingAdditionnalOwnerModal/HousingAdditionalOwnerModal';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import Button from '@codegouvfr/react-dsfr/Button';
import { fr } from '@codegouvfr/react-dsfr';
import Accordion from '@codegouvfr/react-dsfr/Accordion';
import AppSelect from '../../AppSelect/AppSelect';
import AppTextInput from '../../AppTextInput/AppTextInput';

const modal = createModal({
  id: 'housing-owners-modal',
  isOpenedByDefault: true,
});

interface Props {
  housingId: string;
  housingOwners: HousingOwner[];
  onSubmit: (owners: HousingOwner[]) => void;
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

  const [housingOwners, setHousingOwners] =
    useState<HousingOwner[]>(initialHousingOwners);

  const [ownerInputs, setOwnerInputs] = useState<OwnerInput[]>(
    housingOwners.map((housingOwner: HousingOwner) => ({
      ...housingOwner,
      rank: String(housingOwner.endDate ? 0 : housingOwner.rank),
      birthDate: housingOwner?.birthDate
        ? format(housingOwner.birthDate, 'yyyy-MM-dd')
        : '',
    }))
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
  const hasError = (key: string) => form.hasError(key);

  return (
    <>
      <Button
        className="float-right fr-pr-0"
        iconId="fr-icon-edit-fill"
        priority="tertiary no outline"
        title="Modifier le propriétaire"
        onClick={modal.open}
      >
        Modifier
      </Button>
      <modal.Component
        size="large"
        title="Modifier les propriétaires"
        buttons={[
          {
            children: 'Annuler',
            priority: 'secondary',
          },
          {
            children: 'Enregistrer',
            onClick: submit,
            doClosesModal: false,
          },
        ]}
      >
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
            <Row gutters>
              <Col n="12" className="align-right">
                <hr />
                <HousingAdditionalOwnerModal
                  housingId={housingId}
                  activeOwnersCount={housingOwners.filter((_) => _.rank).length}
                  onAddOwner={(housingOwner) =>
                    setHousingOwners([...housingOwners, housingOwner])
                  }
                />
              </Col>
            </Row>
          </Container>
        </>
      </modal.Component>
    </>
  );
};

export default HousingOwnersModal;
