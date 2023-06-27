import React, { useEffect, useImperativeHandle, useState } from 'react';
import { Col, Row, Select, Text } from '@dataesr/react-dsfr';
import { HousingUpdate } from '../../models/Housing';
import {
  getStatusPrecisionOptions,
  getSubStatusOptions,
  HousingStatus,
} from '../../models/HousingState';
import { SelectOption } from '../../models/SelectOption';

import * as yup from 'yup';
import AppMultiSelect from '../AppMultiSelect/AppMultiSelect';
import { statusOptions } from '../../models/HousingFilters';
import HousingStatusSelect from './HousingStatusSelect';
import ButtonLink from '../ButtonLink/ButtonLink';
import VacancyReasonModal from '../modals/VacancyReasonsModal/VacancyReasonModal';
import { useForm } from '../../hooks/useForm';
import AppTextInput from '../AppTextInput/AppTextInput';

interface Props {
  currentStatus?: HousingStatus;
  currentSubStatus?: string;
  currentPrecisions?: string[];
  currentVacancyReasons?: string[];
  fromDefaultCampaign?: boolean;
  onSubmit: (housingUpdate: HousingUpdate) => void;
}

const HousingEditionForm = (
  {
    currentStatus,
    currentSubStatus,
    currentPrecisions,
    currentVacancyReasons,
    fromDefaultCampaign,
    onSubmit,
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
  const [comment, setComment] = useState<string>();
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

  const shape = {
    status: yup.string().required('Veuillez sélectionner un statut.'),
    subStatus: yup
      .string()
      .nullable()
      .when('hasSubStatus', {
        is: true,
        then: yup.string().required('Veuillez sélectionner un sous statut.'),
      }),
    comment: yup.string().nullable(),
  };
  type FormShape = typeof shape;

  const form = useForm(yup.object().shape(shape), {
    hasSubStatus: subStatusOptions !== undefined,
    status,
    subStatus,
    comment,
  });

  useImperativeHandle(ref, () => ({
    submit: async () => {
      await form.validate(() =>
        onSubmit({
          status: +(status ?? HousingStatus.Waiting),
          subStatus: subStatus,
          precisions,
          vacancyReasons,
          comment,
        })
      );
    },
  }));

  return (
    <>
      <div className="bg-white fr-m-2w fr-p-2w">
        <Text size="lg" bold spacing="mb-2w">
          Mobilisation du logement
        </Text>
        <Row gutters>
          <Col n="6">
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
                messageType={form.messageType('subStatus') as 'valid' | 'error'}
                message={form.message('subStatus')}
                onChange={(e: any) => selectSubStatus(status, e.target.value)}
                required
              />
            )}
          </Col>
          <Col n="12">
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
          Causes de la vacance{' '}
          {vacancyReasons?.length !== undefined &&
            vacancyReasons?.length > 0 && <>({vacancyReasons.length})</>}
        </Text>
        <Text className="fr-my-0">
          {vacancyReasons?.map((reason, index) => (
            <div key={`vacancy_reason_${index}`}>{reason}</div>
          ))}
        </Text>
        <ButtonLink
          isSimple
          onClick={() => setIsVacancyReasonsModalOpen(true)}
          icon={vacancyReasons?.length ? 'ri-edit-2-fill' : ''}
          iconPosition="left"
        >
          {vacancyReasons?.length !== undefined && vacancyReasons?.length > 0
            ? 'Modifier'
            : 'Sélectionnez une ou plusieurs options'}
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
      </div>
      <div className="bg-white fr-m-2w fr-p-2w">
        <Text size="lg" bold spacing="mb-2w">
          Note
        </Text>
        <AppTextInput<FormShape>
          textarea
          rows={3}
          onChange={(e) => setComment(e.target.value)}
          inputForm={form}
          inputKey="comment"
          placeholder="Tapez votre note ici..."
        />
      </div>
    </>
  );
};

export default React.forwardRef(HousingEditionForm);
