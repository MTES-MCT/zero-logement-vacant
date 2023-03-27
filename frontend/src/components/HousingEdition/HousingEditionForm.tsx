import React, { useEffect, useImperativeHandle, useState } from 'react';
import {
  Col,
  Row,
  Select,
  Tag,
  TagGroup,
  Text,
  TextInput,
} from '@dataesr/react-dsfr';
import { HousingUpdate } from '../../models/Housing';
import {
  getStatusPrecisionOptions,
  getSubStatusOptions,
  HousingStatus,
} from '../../models/HousingState';
import { SelectOption } from '../../models/SelectOption';

import * as yup from 'yup';
import { ValidationError } from 'yup/es';
import AppMultiSelect from '../AppMultiSelect/AppMultiSelect';
import { statusOptions } from '../../models/HousingFilters';
import HousingStatusSelect from './HousingStatusSelect';
import ButtonLink from '../ButtonLink/ButtonLink';
import VacancyReasonModal from '../modals/VacancyReasonsModal/VacancyReasonModal';
import styles from './housing-edition-form.module.scss';
import classNames from 'classnames';

interface Props {
  currentStatus?: HousingStatus;
  currentSubStatus?: string;
  currentPrecisions?: string[];
  currentVacancyReasons?: string[];
  fromDefaultCampaign?: boolean;
  onValidate: (housingUpdate: HousingUpdate) => void;
}

const HousingEditionForm = (
  {
    currentStatus,
    currentSubStatus,
    currentPrecisions,
    currentVacancyReasons,
    fromDefaultCampaign,
    onValidate,
  }: Props,
  ref: any
) => {
  const [status, setStatus] = useState<HousingStatus>();
  const [subStatus, setSubStatus] = useState<string | undefined>(
    currentSubStatus
  );
  const [precisions, setPrecisions] = useState<string[] | undefined>(
    currentPrecisions
  );
  const [vacancyReasons, setVacancyReasons] = useState<string[] | undefined>(
    currentVacancyReasons
  );
  const [subStatusOptions, setSubStatusOptions] = useState<SelectOption[]>();
  const [precisionOptions, setPrecisionOptions] = useState<SelectOption[]>();
  const [contactKind, setContactKind] = useState<string>();
  const [comment, setComment] = useState<string>();
  const [formErrors, setFormErrors] = useState<any>({});
  const [isVacancyReasonsModalOpen, setIsVacancyReasonsModalOpen] =
    useState<boolean>(false);

  useEffect(() => {
    selectStatus(currentStatus ?? HousingStatus.Waiting);
  }, [currentStatus]); //eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    selectSubStatus(currentStatus, currentSubStatus);
  }, [currentStatus, currentSubStatus]); //eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setPrecisions(currentPrecisions);
  }, [currentPrecisions]);
  useEffect(() => {
    setVacancyReasons(currentVacancyReasons);
  }, [currentVacancyReasons]);

  const selectStatus = (newStatus: HousingStatus) => {
    setFormErrors({});
    setStatus(+newStatus);
    setSubStatusOptions(getSubStatusOptions(newStatus));
    selectSubStatus(
      newStatus,
      getSubStatusOptions(newStatus)
        ?.map((_) => _.label)
        .find((_) => _ === subStatus)
    );
  };

  const selectSubStatus = (status?: HousingStatus, newSubStatus?: string) => {
    setFormErrors({});
    setSubStatus(newSubStatus);
    if (newSubStatus && status) {
      setPrecisionOptions(getStatusPrecisionOptions(status, newSubStatus));
      setPrecisions(
        getStatusPrecisionOptions(status, newSubStatus)
          ?.map((_) => _.label)
          .filter((_) => precisions && precisions.indexOf(_) !== -1)
      );
    } else {
      setPrecisions(undefined);
      setPrecisionOptions(undefined);
    }
  };

  const contactKindOptions = [
    { value: 'Appel entrant', label: 'Appel entrant', icon: 'ri-phone-fill' },
    {
      value: 'Appel sortant - relance',
      label: 'Appel sortant - relance',
      icon: 'ri-phone-fill',
    },
    {
      value: 'Courrier entrant',
      label: 'Courrier entrant',
      icon: 'ri-mail-fill',
    },
    {
      value: 'Courrier sortant',
      label: 'Courrier sortant',
      icon: 'ri-mail-send-fill',
    },
    {
      value: 'Formulaire en ligne',
      label: 'Formulaire en ligne',
      icon: 'ri-survey-fill',
    },
    { value: 'Mail entrant', label: 'Mail entrant', icon: 'ri-message-2-fill' },
    { value: 'Mail sortant', label: 'Mail sortant', icon: 'ri-message-2-fill' },
    {
      value: 'Retour indirect - via acteur terrain',
      label: 'Retour indirect - via acteur terrain',
      icon: 'ri-footprint-fill',
    },
    {
      value: 'Retour poste - NPAI',
      label: 'Retour poste - NPAI',
      icon: 'ri-mail-close-fill',
    },
    {
      value: 'Visite - Rencontre',
      label: 'Visite - Rencontre',
      icon: 'ri-service-fill',
    },
  ];

  const updatingForm = yup.object().shape({
    status: yup
      .string()
      .required('Veuillez sélectionner un statut.')
      .when('noStatusChange', {
        is: true,
        then: yup
          .string()
          .notOneOf(['0'], 'Veuillez sélectionner un statut différent.'),
      }),
    subStatus: yup
      .string()
      .nullable()
      .when('hasSubStatus', {
        is: true,
        then: yup.string().required('Veuillez sélectionner un sous statut.'),
      }),
    contactKind: yup
      .string()
      .nullable()
      .when('hasContactKind', {
        is: true,
        then: yup
          .string()
          .required("Veuillez sélectionner un type d'interaction."),
      }),
  });

  useImperativeHandle(ref, () => ({
    validate: () => {
      setFormErrors({});
      updatingForm
        .validate(
          {
            hasSubStatus: subStatusOptions !== undefined,
            hasContactKind: status !== HousingStatus.NeverContacted,
            noStatusChange: currentStatus === status,
            status,
            subStatus,
            contactKind,
          },
          { abortEarly: false }
        )
        .then(() =>
          onValidate({
            status: +(status ?? HousingStatus.Waiting),
            subStatus: subStatus,
            precisions,
            contactKind:
              status === HousingStatus.NeverContacted
                ? 'Jamais contacté'
                : contactKind,
            vacancyReasons,
            comment,
          })
        )
        .catch((err: any) => {
          const object: any = {};
          err.inner.forEach((x: ValidationError) => {
            if (x.path !== undefined && x.errors.length) {
              object[x.path] = x.errors[0];
            }
          });
          setFormErrors(object);
        });
    },
  }));

  return (
    <>
      <Text size="lg" bold spacing="mb-2w">
        CHANGEMENT DE STATUT
      </Text>
      <Row gutters>
        <Col n="12">
          <HousingStatusSelect
            selected={status}
            options={statusOptions(
              fromDefaultCampaign ||
                !currentStatus ||
                +currentStatus === HousingStatus.NeverContacted
                ? []
                : [HousingStatus.NeverContacted]
            )}
            onChange={(e: HousingStatus) => {
              selectStatus(e);
            }}
          />
        </Col>
        <Col n="6">
          {subStatusOptions && (
            <Select
              label="Sous-statut"
              options={subStatusOptions}
              selected={subStatus}
              messageType={formErrors['subStatus'] ? 'error' : undefined}
              message={formErrors['subStatus']}
              onChange={(e: any) => selectSubStatus(status, e.target.value)}
              required
            />
          )}
        </Col>
        <Col n="6">
          {precisionOptions && (
            <AppMultiSelect
              label="Précision(s)"
              defaultOption="Aucune"
              options={precisionOptions}
              initialValues={precisions}
              onChange={(values) => setPrecisions(values)}
            />
          )}
        </Col>
      </Row>
      <Text className="fr-mt-3w fr-mb-0">
        Causes de la vacance ({vacancyReasons?.length ?? 0})
      </Text>
      <ButtonLink isSimple onClick={() => setIsVacancyReasonsModalOpen(true)}>
        Sélectionnez une ou plusieurs options
      </ButtonLink>
      {isVacancyReasonsModalOpen && (
        <VacancyReasonModal
          currentVacancyReasons={vacancyReasons}
          onClose={() => setIsVacancyReasonsModalOpen(false)}
          onSubmit={(vacancyReasons) => {
            setVacancyReasons(vacancyReasons);
            setIsVacancyReasonsModalOpen(false);
          }}
        />
      )}
      <Text className="fr-mb-2w fr-mt-4w">
        <b>INFORMATIONS COMPLÉMENTAIRES</b>
      </Text>
      <Text className="fr-mb-1w">Sélectionnez le type d'interaction</Text>
      <TagGroup>
        {contactKindOptions.map((contactKindOption) => (
          <Tag
            small
            icon={contactKindOption.icon}
            iconPosition="left"
            onClick={() => setContactKind(contactKindOption.value)}
            selected={contactKind === contactKindOption.value}
            key={contactKindOption.value}
            className={classNames({
              [styles.tagNotSelected]: contactKind !== contactKindOption.value,
            })}
          >
            {contactKindOption.label}
          </Tag>
        ))}
      </TagGroup>
      {formErrors['contactKind'] && (
        <span className="fr-error-text fr-mt-0 fr-mb-2w">
          {formErrors['contactKind']}
        </span>
      )}
      <TextInput
        textarea
        label="Ajouter une note"
        rows={3}
        onChange={(e) => setComment(e.target.value)}
      />
    </>
  );
};

export default React.forwardRef(HousingEditionForm);
