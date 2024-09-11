import { useEffect, useMemo, useState } from 'react';
import { Col, Icon, Row, Text } from '../../_dsfr';
import { getHousingOwnerRankLabel, HousingOwner } from '../../../models/Owner';

import * as yup from 'yup';
import { SelectOption } from '../../../models/SelectOption';
import {
  banAddressValidator,
  dateValidator,
  emailValidator,
  useForm
} from '../../../hooks/useForm';
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
import { AddressSearchResult } from '../../../services/address.service';
import Badge from '@codegouvfr/react-dsfr/Badge';
import OwnerAddressEdition from '../../OwnerAddressEdition/OwnerAddressEdition';
import { isBanEligible } from '../../../models/Address';
import { useUser } from '../../../hooks/useUser';
import { Typography } from '@mui/material';
import Alert from '@codegouvfr/react-dsfr/Alert';

interface Props {
  housingId: string;
  housingOwners: HousingOwner[];
  onSubmit: (owners: HousingOwner[]) => Promise<void>;
  onCancel?: () => void;
}

const HousingOwnersModal = ({
  housingId,
  housingOwners: initialHousingOwners,
  onSubmit,
  onCancel
}: Props) => {
  type OwnerInput = Pick<
    HousingOwner,
    | 'id'
    | 'fullName'
    | 'rawAddress'
    | 'email'
    | 'phone'
    | 'kind'
    | 'banAddress'
    | 'additionalAddress'
  > & {
    rank: string;
    birthDate: string;
  };

  const { isVisitor } = useUser();

  const modal = useMemo(
    () =>
      createModal({
        id: `housing-owners-modal-${housingId}`,
        isOpenedByDefault: false
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
    birthDate: housingOwner?.birthDate ?? ''
  });

  const [ownerInputs, setOwnerInputs] = useState<OwnerInput[]>(
    housingOwners.map(getOwnerInput)
  );

  const primaryOwner = ownerInputs?.filter((_) => _.rank === '1');
  const secondaryOwners = ownerInputs?.filter((_) => parseInt(_.rank) > 1);
  const archivedOwners = ownerInputs?.filter(
    (_) =>
      _.rank === '0' || _.rank === '-1' || _.rank === '-2' || _.rank === '-3'
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
        [`banAddress${index}`]: banAddressValidator,
        [`additionalAddress${index}`]: yup.string().nullable().notRequired()
      }),
      {}
    ),
    ownerRanks: yup.array().test({
      test(array, ctx) {
        if ((array ?? []).filter((_) => _.rank === '1').length < 1) {
          return ctx.createError({
            message:
              'Vous devez définir un propriétaire principal pour enregistrer.'
          });
        }
        if ((array ?? []).filter((_) => _.rank === '1').length > 1) {
          return ctx.createError({
            message: "Il ne peut y avoir qu'un propriétaire principal"
          });
        }
        for (const rank of ranks) {
          if (
            (array ?? []).filter((_) => _.rank === String(rank + 1)).length > 1
          ) {
            return ctx.createError({
              message: `Il ne peut y avoir qu'un ${rank + 1}ème ayant-droit`
            });
          }
        }
        return true;
      }
    })
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
    { value: '1', label: 'Propriétaire principal' },
    ...ranks.map((_) => ({
      value: String(_ + 1),
      label: _ + 1 + 'ème ayant droit'
    })),
    { value: '0', label: 'Ancien propriétaire' },
    { value: '-1', label: 'Propriétaire incorrect' },
    { value: '-3', label: 'Propriétaire décédé.e' }
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
          [`banAddress${index}`]: ownerInput.banAddress,
          [`additionalAddress${index}`]: ownerInput.additionalAddress
        }),
        {}
      ),
      ownerRanks: ownerInputs
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
                  : undefined
            }))
            .find((_) => _.id === ho.id) ?? {})
        }))
      );
      modal.close();
    });
  };

  const onSelectAddress = (
    ownerInput: OwnerInput,
    addressSearchResult?: AddressSearchResult
  ) => {
    changeOwnerInputs({
      ...ownerInput,
      banAddress: addressSearchResult
    });
  };

  useEffect(() => {
    ownerInputs.forEach((_, index) =>
      form.validateAt(`banAddress${index}` as keyof FormShape)
    );
  }, [ownerInputs]); // eslint-disable-line react-hooks/exhaustive-deps

  // @ts-expect-error: dynamic key
  const message = (key: string) => form.message(key);
  // @ts-expect-error: dynamic key
  const hasError = (key: string) => form.hasError(key);

  function iconName(kind: string = '') {
    return ['SCI', 'Investisseur'].includes(kind)
      ? 'fr-icon-team-fill'
      : 'fr-icon-user-fill';
  }

  useEffect(() => {
    const element = document.getElementById(modal.id);
    const onConceal = () => onCancel?.();
    if (element && isOpen) {
      element.addEventListener('dsfr.conceal', onConceal);

      return () => {
        element.removeEventListener('dsfr.conceal', onConceal);
      };
    }
  }, [modal, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  function ownerAccordion(ownerInput: OwnerInput, index: string) {
    return (
      <Accordion
        label={
          <div>
            <span className="icon-xs">
              <Icon
                name={iconName(ownerInput.kind)}
                iconPosition="center"
                size="xs"
              />
            </span>
            <Text as="span">
              <b>{ownerInput.fullName}</b>
            </Text>
            <Text
              size="sm"
              className="zlv-label fr-ml-1w"
              as="span"
              aria-label="Rang du propriétaire"
            >
              {getHousingOwnerRankLabel(Number(ownerInput.rank))}
            </Text>
            {!isBanEligible(ownerInput.banAddress) && (
              <Badge severity="info" className="fr-ml-1w">
                ADRESSE À VÉRIFIER
              </Badge>
            )}
          </div>
        }
        id={index}
        key={index}
        className={classNames({
          error:
            hasError(`fullName${index}`) ||
            hasError(`banAddress${index}`) ||
            hasError(`birthDate${index}`) ||
            hasError(`email${index}`) ||
            hasError(`additionalAddress${index}`)
        })}
      >
        <AppSelect<FormShape>
          onChange={(e) =>
            changeOwnerInputs({
              ...ownerInput,
              rank: e.target.value
            })
          }
          value={String(ownerInput.rank)}
          inputForm={form}
          disabled={ownerInput.rank === '-2'}
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
                  fullName: e.target.value
                })
              }
              required
              label="Nom prénom"
              inputForm={form}
              disabled={ownerInput.rank === '-2'}
              // @ts-expect-error: dynamic key
              inputKey={`fullName${index}`}
            />
          </Col>
          <Col n="6">
            <AppTextInput<FormShape>
              type={'date'}
              value={ownerInput.birthDate ?? ''}
              onChange={(e) =>
                changeOwnerInputs({
                  ...ownerInput,
                  birthDate: e.target.value
                })
              }
              label="Date de naissance"
              inputForm={form}
              disabled={ownerInput.rank === '-2'}
              // @ts-expect-error: dynamic key
              inputKey={`birthDate$${index}`}
            />
          </Col>
          <Col n="12">
            <OwnerAddressEdition
              banAddress={ownerInput.banAddress}
              rawAddress={ownerInput.rawAddress}
              disabled={ownerInput.rank === '-2'}
              onSelectAddress={(a) => onSelectAddress(ownerInput, a)}
              errorMessage={message(`banAddress${index}`)}
            />
          </Col>
          <Col n="12">
            <AppTextInput<FormShape>
              value={ownerInput.additionalAddress ?? ''}
              onChange={(e) =>
                changeOwnerInputs({
                  ...ownerInput,
                  additionalAddress: e.target.value
                })
              }
              label="Complément d'adresse"
              inputForm={form}
              disabled={ownerInput.rank === '-2'}
              // @ts-expect-error: dynamic key
              inputKey={`additionalAddress$${index}`}
            />
          </Col>
          <Col n="6">
            <AppTextInput<FormShape>
              type={'email'}
              value={ownerInput.email ?? ''}
              onChange={(e) =>
                changeOwnerInputs({
                  ...ownerInput,
                  email: e.target.value
                })
              }
              label="Adresse mail"
              inputForm={form}
              disabled={ownerInput.rank === '-2'}
              // @ts-expect-error: dynamic key
              inputKey={`email$${index}`}
            />
          </Col>
          <Col n="6">
            <AppTextInput<FormShape>
              value={ownerInput.phone}
              onChange={(e) =>
                changeOwnerInputs({
                  ...ownerInput,
                  phone: e.target.value
                })
              }
              label="Numéro de téléphone"
              inputForm={form}
              disabled={ownerInput.rank === '-2'}
              // @ts-expect-error: dynamic key
              inputKey={`phone$${index}`}
            />
          </Col>
        </Row>
      </Accordion>
    );
  }

  return (
    <>
      {!isVisitor && (
        <Button
          className="float-right"
          iconId="fr-icon-edit-fill"
          priority="tertiary no outline"
          title="Modifier le propriétaire"
          onClick={modal.open}
        >
          Modifier
        </Button>
      )}
      <modal.Component
        size="large"
        title={
          modalMode === 'list' ? (
            <>
              Modifier les propriétaires
              <Button
                priority="secondary"
                iconId="fr-icon-add-line"
                title="Ajouter un propriétaire"
                onClick={() => setModalMode('add')}
                className="float-right"
              >
                Ajouter un propriétaire
              </Button>
            </>
          ) : (
            "Ajout d'un nouveau propriétaire"
          )
        }
        buttons={
          modalMode === 'list'
            ? [
                {
                  children: 'Annuler',
                  priority: 'secondary',
                  onClick: onCancel
                },
                {
                  children: 'Enregistrer',
                  onClick: submit,
                  doClosesModal: false
                }
              ]
            : [
                {
                  children: 'Retour',
                  priority: 'secondary',
                  doClosesModal: false,
                  onClick: () => setModalMode('list')
                }
              ]
        }
        style={{ textAlign: 'initial', fontWeight: 'initial' }}
      >
        {modalMode === 'list' ? (
          <>
            {hasError('ownerRanks') && (
              <Alert
                severity="warning"
                description={message('ownerRanks')}
                closable
                small
              ></Alert>
            )}
            {primaryOwner && primaryOwner.length > 0 && (
              <>
                <Typography component="h2" variant="h6" mb={1} mt={4}>
                  Propriétaire principal
                </Typography>
                <div className={fr.cx('fr-accordions-group')}>
                  {primaryOwner.map((ownerInput, index) =>
                    ownerAccordion(ownerInput, `primary-owner-${index}`)
                  )}
                </div>
              </>
            )}
            {secondaryOwners && secondaryOwners.length > 0 && (
              <>
                <Typography component="h2" variant="h6" mb={1} mt={2}>
                  Propriétaires secondaires ({secondaryOwners.length})
                </Typography>
                <div className={fr.cx('fr-accordions-group')}>
                  {secondaryOwners.map((ownerInput, index) =>
                    ownerAccordion(ownerInput, `secondary-owner-${index}`)
                  )}
                </div>
              </>
            )}
            {archivedOwners && archivedOwners.length > 0 && (
              <>
                <Typography component="h2" variant="h6" mb={1} mt={2}>
                  Propriétaires archivés ({archivedOwners.length})
                </Typography>
                <div className={fr.cx('fr-accordions-group')}>
                  {archivedOwners.map((ownerInput, index) =>
                    ownerAccordion(ownerInput, `archived-owner-${index}`)
                  )}
                </div>
              </>
            )}
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
