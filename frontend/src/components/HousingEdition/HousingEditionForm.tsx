import React, { useEffect, useImperativeHandle, useState } from 'react';
import { Alert, Col, Row, Select, Text } from '@dataesr/react-dsfr';
import { Housing, HousingUpdate, OccupancyKind } from '../../models/Housing';
import {
  getStatusPrecisionOptions,
  getSubStatusOptions,
  HousingStatus,
} from '../../models/HousingState';
import { SelectOption } from '../../models/SelectOption';

import * as yup from 'yup';
import AppMultiSelect from '../AppMultiSelect/AppMultiSelect';
import {
  allOccupancyOptions,
  statusOptions,
} from '../../models/HousingFilters';
import HousingStatusSelect from './HousingStatusSelect';
import ButtonLink from '../ButtonLink/ButtonLink';
import VacancyReasonModal from '../modals/VacancyReasonsModal/VacancyReasonModal';
import { useForm } from '../../hooks/useForm';
import AppTextInput from '../AppTextInput/AppTextInput';
import _ from 'lodash';
import ConfirmationModal from '../modals/ConfirmationModal/ConfirmationModal';

interface Props {
  current: Pick<
    Partial<Housing>,
    | 'occupancy'
    | 'occupancyIntended'
    | 'status'
    | 'subStatus'
    | 'precisions'
    | 'vacancyReasons'
  >;
  fromDefaultCampaign?: boolean;
  housingCount?: number;
  withOccupancy?: boolean;
  onSubmit: (housingUpdate: HousingUpdate) => void;
}

const HousingEditionForm = (
  {
    current,
    fromDefaultCampaign,
    withOccupancy,
    housingCount,
    onSubmit,
  }: Props,
  ref: any
) => {
  const [occupancy, setOccupancy] = useState<OccupancyKind | undefined>(
    current.occupancy
  );
  const [occupancyIntended, setOccupancyIntended] = useState<
    OccupancyKind | undefined
  >(current.occupancyIntended);
  const [status, setStatus] = useState<HousingStatus>();
  const [subStatus, setSubStatus] = useState<string | undefined>(
    current.subStatus
  );
  const [precisions, setPrecisions] = useState<string[] | undefined>(
    current.precisions
  );
  const [vacancyReasons, setVacancyReasons] = useState<string[] | undefined>(
    current.vacancyReasons
  );
  const [subStatusOptions, setSubStatusOptions] = useState<SelectOption[]>();
  const [precisionOptions, setPrecisionOptions] = useState<SelectOption[]>();
  const [comment, setComment] = useState<string>();
  const [noteKind, setNoteKind] = useState<string>();
  const [isVacancyReasonsModalOpen, setIsVacancyReasonsModalOpen] =
    useState<boolean>(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] =
    useState<boolean>(false);

  useEffect(() => {
    selectStatus(current.status ?? HousingStatus.Waiting);
  }, [current.status]); //eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    selectSubStatus(current.status, current.subStatus);
  }, [current.status, current.subStatus]); //eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setPrecisions(current.precisions);
  }, [current.precisions]);
  useEffect(() => {
    setVacancyReasons(current.vacancyReasons);
  }, [current.vacancyReasons]);

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
    ...(withOccupancy
      ? {
          occupancy: yup
            .string()
            .required("Veuillez sélectionner un statut d'occupation."),
          occupancyIntended: yup.string().nullable(),
        }
      : {}),
    status: yup.string().required('Veuillez sélectionner un statut.'),
    subStatus: yup
      .string()
      .nullable()
      .when('hasSubStatus', {
        is: true,
        then: yup.string().required('Veuillez sélectionner un sous statut.'),
      }),
    comment: yup.string().nullable(),
    noteKind: yup.string().nullable(),
  };
  type FormShape = typeof shape;

  const form = useForm(yup.object().shape(shape), {
    ...(withOccupancy
      ? {
          occupancy,
          occupancyIntended,
        }
      : {}),
    hasSubStatus: subStatusOptions !== undefined,
    status,
    subStatus,
    comment,
    noteKind,
  });

  const isStatusUpdate =
    current.status !== status ||
    current.subStatus !== subStatus ||
    !_.isEqual(current.precisions, precisions) ||
    !_.isEqual(current.vacancyReasons, vacancyReasons);

  const isOccupancyUpdate =
    withOccupancy &&
    (current.occupancy !== occupancy ||
      current.occupancyIntended !== occupancyIntended);

  const hasNote = comment && comment?.length > 0;

  useImperativeHandle(ref, () => ({
    submit: async () => {
      await form.validate(() =>
        housingCount ? setIsConfirmationModalOpen(true) : submitForm()
      );
    },
  }));

  const submitForm = () => {
    onSubmit({
      statusUpdate: isStatusUpdate
        ? {
            status: +(status ?? HousingStatus.Waiting),
            subStatus: subStatus,
            precisions,
            vacancyReasons: vacancyReasons ?? [],
          }
        : undefined,
      occupancyUpdate: isOccupancyUpdate
        ? {
            occupancy: occupancy!,
            occupancyIntended,
          }
        : undefined,
      note: hasNote
        ? {
            content: comment,
            noteKind: noteKind!,
          }
        : undefined,
    });
  };

  const notesOptions: SelectOption[] = [
    'Note courante',
    'Échanges avec le(s) propriétaire(s)',
    'Échanges avec une partie prenante',
    'Diagnostic/Qualification',
    'Avis de situation',
  ].map((note) => ({
    label: note,
    value: note,
  }));

  return (
    <>
      {withOccupancy && (
        <div className="bg-white fr-m-2w fr-p-2w">
          <Text size="lg" bold spacing="mb-2w">
            Occupation du logement
          </Text>
          <Row gutters>
            <Col n="6">
              <Select
                label="Occupation actuelle"
                options={allOccupancyOptions}
                selected={occupancy}
                messageType={form.messageType('occupancy') as 'valid' | 'error'}
                message={form.message('occupancy')}
                onChange={(e: any) => setOccupancy(e.target.value)}
                required
              />
            </Col>
            <Col n="6">
              <Select
                label="Occupation prévisionnelle"
                options={[
                  { label: "Pas d'informations", value: '' },
                  ...allOccupancyOptions,
                ]}
                selected={occupancyIntended}
                messageType={
                  form.messageType('occupancyIntended') as 'valid' | 'error'
                }
                message={form.message('occupancyIntended')}
                onChange={(e: any) => setOccupancyIntended(e.target.value)}
              />
            </Col>
          </Row>
        </div>
      )}
      <div className="bg-white fr-m-2w fr-p-2w">
        <Text size="lg" bold spacing="mb-2w">
          Mobilisation du logement
        </Text>
        <Row gutters>
          <Col n="12">
            <HousingStatusSelect
              selected={status}
              options={statusOptions(
                fromDefaultCampaign ||
                  !current.status ||
                  +current.status === HousingStatus.NeverContacted
                  ? []
                  : [HousingStatus.NeverContacted]
              )}
              onChange={(e: HousingStatus) => {
                selectStatus(e);
              }}
            />
          </Col>
          <Col n="12">
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
        <Select
          label="Type de note"
          options={notesOptions}
          selected={noteKind}
          messageType={form.messageType('noteKind') as 'valid' | 'error'}
          message={form.message('noteKind')}
          onChange={(e: any) => setNoteKind(e.target.value)}
        />
      </div>
      {isConfirmationModalOpen && (
        <ConfirmationModal
          onSubmit={submitForm}
          onClose={() => setIsConfirmationModalOpen(false)}
          title={`Vous êtes sur le point de mettre à jour ${housingCount} logements`}
        >
          <Alert
            type="warning"
            description="Cette action écrasera les anciennes données."
          ></Alert>
          <ul className="fr-mt-2w">
            {isStatusUpdate && <li>Mise à jour de la mobilisation</li>}
            {hasNote && <li>Ajout d’une note</li>}
          </ul>
        </ConfirmationModal>
      )}
    </>
  );
};

export default React.forwardRef(HousingEditionForm);
