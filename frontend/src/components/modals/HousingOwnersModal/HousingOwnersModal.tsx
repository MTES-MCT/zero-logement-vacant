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
import { useList } from 'react-use';
import fp from 'lodash/fp';

interface Props {
  housingId: string;
  housingOwners: HousingOwner[];
  onSubmit: (owners: HousingOwner[]) => Promise<void>;
  onCancel?: () => void;
}

function HousingOwnersModal({
  housingId,
  housingOwners: initialHousingOwners,
  onSubmit,
  onCancel
}: Props) {
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
      resetHousingOwners();
    }
  }, [isOpen]); //eslint-disable-line react-hooks/exhaustive-deps

  const [modalMode, setModalMode] = useState<'list' | 'add'>('list');
  const [
    housingOwners,
    {
      reset: resetHousingOwners,
      push: appendHousingOwner,
      updateFirst: updateHousingOwner
    }
  ] = useList(initialHousingOwners);

  const primaryOwner = housingOwners.filter((ho) => ho.rank === 1);
  const secondaryOwners = housingOwners.filter((ho) => ho.rank >= 2);
  const archivedOwners = housingOwners.filter((ho) => ho.rank <= 0);

  const shape = {
    ...housingOwners.reduce(
      (shape, housingOwner) => ({
        ...shape,
        [`fullName-${housingOwner.id}`]: yup
          .string()
          .required('Veuillez renseigner un nom.'),
        [`email-${housingOwner.id}`]: emailValidator.nullable().notRequired(),
        [`birthDate-${housingOwner.id}`]: dateValidator
          .nullable()
          .notRequired(),
        [`banAddress-${housingOwner.id}`]: banAddressValidator,
        [`additionalAddress-${housingOwner.id}`]: yup
          .string()
          .nullable()
          .notRequired()
      }),
      {}
    ),
    ownerRanks: yup.array().test({
      test(array, ctx) {
        const owners = array ?? [];

        if (owners.every((owner) => owner.rank !== 1)) {
          return ctx.createError({
            message:
              'Vous devez définir un propriétaire principal pour enregistrer.'
          });
        }

        if (owners.filter((owner) => owner.rank === 1).length >= 2) {
          return ctx.createError({
            message: "Il ne peut y avoir qu'un propriétaire principal"
          });
        }

        const findOverlaps = fp.pipe(
          fp.filter((housingOwner: any) => housingOwner.rank >= 1),
          fp.groupBy((housingOwner) => housingOwner.rank),
          fp.pickBy((housingOwners) => housingOwners.length > 1),
          fp.keys
        );
        const overlaps = findOverlaps(owners);
        if (overlaps.length > 0) {
          const [overlap] = overlaps;
          return ctx.createError({
            message: `Il ne peut y avoir qu'un ${overlap}ème ayant-droit`
          });
        }
        return true;
      }
    })
  };
  type FormShape = typeof shape;

  function changeOwnerInputs(housingOwner: HousingOwner) {
    updateHousingOwner((a, b) => a.id === b.id, housingOwner);
  }

  const secondaryRanks =
    secondaryOwners.length > 0
      ? // Starts at rank 2
        Array.from({ length: secondaryOwners.length }, (_, i) => i + 2)
      : [];

  const ownerRankOptions: SelectOption[] = [
    { value: '1', label: 'Propriétaire principal' },
    ...secondaryRanks.map((i) => ({
      value: String(i),
      label: `${i}ème ayant droit`
    })),
    { value: '0', label: 'Ancien propriétaire' },
    { value: '-1', label: 'Propriétaire incorrect' },
    { value: '-3', label: 'Propriétaire décédé.e' }
  ];

  const form = useForm(
    yup.object().shape(shape),
    {
      ...housingOwners.reduce(
        (inputs, housingOwner) => ({
          ...inputs,
          [`fullName-${housingOwner.id}`]: housingOwner.fullName,
          [`email-${housingOwner.id}`]: housingOwner.email,
          [`birthDate-${housingOwner.id}`]: housingOwner.birthDate,
          [`banAddress-${housingOwner.id}`]: housingOwner.banAddress,
          [`additionalAddress-${housingOwner.id}`]:
            housingOwner.additionalAddress
        }),
        {}
      ),
      ownerRanks: housingOwners
    },
    ['ownerRanks']
  );

  function onAddOwner(housingOwner: HousingOwner) {
    appendHousingOwner(housingOwner);
    setModalMode('list');
  }

  async function submit() {
    await form.validate(async () => {
      await onSubmit(housingOwners);
      modal.close();
    });
  }

  const onSelectAddress = (
    ownerInput: HousingOwner,
    addressSearchResult?: AddressSearchResult
  ) => {
    if (addressSearchResult) {
      changeOwnerInputs({
        ...ownerInput,
        banAddress: addressSearchResult
      });
    }
  };

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

  function OwnerAccordion(housingOwner: HousingOwner) {
    const index = `housing-owner-${housingOwner.id}`;
    return (
      <Accordion
        label={
          <div>
            <span className="icon-xs">
              <Icon
                name={iconName(housingOwner.kind)}
                iconPosition="center"
                size="xs"
              />
            </span>
            <Text as="span">
              <b>{housingOwner.fullName}</b>
            </Text>
            <Text
              size="sm"
              className="zlv-label fr-ml-1w"
              as="span"
              aria-label="Rang du propriétaire"
            >
              {getHousingOwnerRankLabel(housingOwner.rank)}
            </Text>
            {!isBanEligible(housingOwner.banAddress) && (
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
            hasError(`fullName-${index}`) ||
            hasError(`banAddress-${index}`) ||
            hasError(`birthDate-${index}`) ||
            hasError(`email-${index}`) ||
            hasError(`additionalAddress-${index}`)
        })}
      >
        <AppSelect<FormShape>
          onChange={(e) =>
            changeOwnerInputs({
              ...housingOwner,
              rank: Number(e.target.value)
            })
          }
          value={String(housingOwner.rank)}
          inputForm={form}
          disabled={housingOwner.rank === -2}
          inputKey="ownerRanks"
          options={ownerRankOptions}
        />
        <Row gutters>
          <Col n="6">
            <AppTextInput<FormShape>
              value={housingOwner.fullName}
              onChange={(e) =>
                changeOwnerInputs({
                  ...housingOwner,
                  fullName: e.target.value
                })
              }
              required
              label="Nom prénom"
              inputForm={form}
              disabled={housingOwner.rank === -2}
              // @ts-expect-error: dynamic key
              inputKey={`fullName-${housingOwner.id}`}
            />
          </Col>
          <Col n="6">
            <AppTextInput<FormShape>
              type={'date'}
              value={housingOwner.birthDate ?? ''}
              onChange={(e) =>
                changeOwnerInputs({
                  ...housingOwner,
                  birthDate: e.target.value
                })
              }
              label="Date de naissance"
              inputForm={form}
              disabled={housingOwner.rank === -2}
              // @ts-expect-error: dynamic key
              inputKey={`birthDate-${housingOwner.id}`}
            />
          </Col>
          <Col n="12">
            <OwnerAddressEdition
              banAddress={housingOwner.banAddress}
              rawAddress={housingOwner.rawAddress}
              disabled={housingOwner.rank === -2}
              onSelectAddress={(a) => onSelectAddress(housingOwner, a)}
              errorMessage={message(`banAddress-${housingOwner.id}`)}
            />
          </Col>
          <Col n="12">
            <AppTextInput<FormShape>
              value={housingOwner.additionalAddress ?? ''}
              onChange={(e) =>
                changeOwnerInputs({
                  ...housingOwner,
                  additionalAddress: e.target.value
                })
              }
              label="Complément d'adresse"
              inputForm={form}
              disabled={housingOwner.rank === -2}
              // @ts-expect-error: dynamic key
              inputKey={`additionalAddress-${housingOwner.id}`}
            />
          </Col>
          <Col n="6">
            <AppTextInput<FormShape>
              type={'email'}
              value={housingOwner.email ?? ''}
              onChange={(e) =>
                changeOwnerInputs({
                  ...housingOwner,
                  email: e.target.value
                })
              }
              label="Adresse mail"
              inputForm={form}
              disabled={housingOwner.rank === -2}
              // @ts-expect-error: dynamic key
              inputKey={`email-${housingOwner.id}`}
            />
          </Col>
          <Col n="6">
            <AppTextInput<FormShape>
              value={housingOwner.phone}
              onChange={(e) =>
                changeOwnerInputs({
                  ...housingOwner,
                  phone: e.target.value
                })
              }
              label="Numéro de téléphone"
              inputForm={form}
              disabled={housingOwner.rank === -2}
              // @ts-expect-error: dynamic key
              inputKey={`phone-${housingOwner.id}`}
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
            'Ajout d’un nouveau propriétaire'
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
                  {primaryOwner.map((housingOwner) =>
                    OwnerAccordion(housingOwner)
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
                  {secondaryOwners.map((ownerInput) =>
                    OwnerAccordion(ownerInput)
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
                  {archivedOwners.map((ownerInput) =>
                    OwnerAccordion(ownerInput)
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
}

export default HousingOwnersModal;
