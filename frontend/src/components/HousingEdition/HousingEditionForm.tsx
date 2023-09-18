import React, {
  ChangeEvent,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import { Alert, Col, Icon, Row, Select, Text } from '@dataesr/react-dsfr';
import { Housing, HousingUpdate } from '../../models/Housing';
import { getSubStatusOptions, HousingStatus } from '../../models/HousingState';
import { SelectOption } from '../../models/SelectOption';

import * as yup from 'yup';
import {
  allOccupancyOptions,
  statusOptions,
} from '../../models/HousingFilters';
import HousingStatusSelect from './HousingStatusSelect';
import ButtonLink from '../ButtonLink/ButtonLink';
import { useForm } from '../../hooks/useForm';
import AppTextInput from '../AppTextInput/AppTextInput';
import _ from 'lodash';
import ConfirmationModal from '../modals/ConfirmationModal/ConfirmationModal';
import PrecisionsModal from '../modals/PrecisionsModal/PrecisionsModal';
import { pluralize } from '../../utils/stringUtils';

interface Props {
  housing?: Housing;
  fromDefaultCampaign?: boolean;
  housingCount?: number;
  onSubmit: (housingUpdate: HousingUpdate) => void;
}

const HousingEditionForm = (
  { housing, fromDefaultCampaign, housingCount, onSubmit }: Props,
  ref: any
) => {
  const [occupancy, setOccupancy] = useState(housing?.occupancy);
  const [occupancyIntended, setOccupancyIntended] = useState(
    housing?.occupancyIntended
  );
  const [status, setStatus] = useState<HousingStatus>();
  const [subStatus, setSubStatus] = useState(housing?.subStatus);
  const [precisions, setPrecisions] = useState(housing?.precisions);
  const [vacancyReasons, setVacancyReasons] = useState(housing?.vacancyReasons);
  const [subStatusOptions, setSubStatusOptions] = useState<SelectOption[]>();
  const [comment, setComment] = useState<string>();
  const [noteKind, setNoteKind] = useState<string>();
  const [isPrecisionsModalOpen, setIsPrecisionsModalOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);

  useEffect(() => {
    if (housing) {
      selectStatus(housing.status ?? HousingStatus.Waiting);
    }
  }, [housing?.status]); //eslint-disable-line react-hooks/exhaustive-deps

  const selectStatus = (newStatus: HousingStatus) => {
    setStatus(+newStatus);
    setSubStatusOptions(getSubStatusOptions(newStatus));
    setSubStatus(
      getSubStatusOptions(newStatus)
        ?.map((_) => _.label)
        .find((_) => _ === subStatus)
    );
  };

  const shape = {
    occupancy: yup
      .string()
      .nullable()
      .when('hasCurrent', {
        is: true,
        then: yup
          .string()
          .required("Veuillez sélectionner un statut d'occupation."),
      }),
    occupancyIntended: yup.string().nullable(),
    status: yup
      .string()
      .nullable()
      .when('hasCurrent', {
        is: true,
        then: yup.string().required('Veuillez sélectionner un statut.'),
      }),
    subStatus: yup
      .string()
      .nullable()
      .when('hasSubStatus', {
        is: true,
        then: yup
          .string()
          .required('Veuillez sélectionner un sous-statut de suivi.'),
      }),
    comment: yup.string().nullable(),
    noteKind: yup.string().nullable(),
    hasChange: yup
      .boolean()
      .oneOf([true], 'Veuillez saisir au moins une donnée pour enregistrer.'),
  };
  type FormShape = typeof shape;

  const isStatusUpdate =
    housing?.status !== status ||
    housing?.subStatus !== subStatus ||
    !_.isEqual(housing?.precisions, precisions) ||
    !_.isEqual(housing?.vacancyReasons, vacancyReasons);

  const isOccupancyUpdate =
    housing?.occupancy !== occupancy ||
    housing?.occupancyIntended !== occupancyIntended;

  const hasNote = comment !== undefined && comment.length > 0;

  const form = useForm(yup.object().shape(shape), {
    occupancy,
    occupancyIntended,
    hasSubStatus: subStatusOptions !== undefined,
    hasCurrent: housing !== undefined,
    status,
    subStatus,
    comment,
    noteKind,
    hasChange:
      housing !== undefined ||
      status !== undefined ||
      occupancy !== undefined ||
      occupancyIntended !== undefined ||
      hasNote,
  });

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
            subStatus,
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
    setIsConfirmationModalOpen(false);
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
      <div className="bg-975 fr-py-2w fr-px-3w">
        <Text size="lg" bold spacing="mb-2w">
          <Icon
            name="ri-information-fill"
            size="lg"
            verticalAlign="middle"
            className="color-bf113"
          />
          Mobilisation 
          {pluralize(housingCount ?? 1, [{ old: 'du', new: 'des' }])(
            'du logement'
          )}
        </Text>
        <div className="fr-select-group">
          <HousingStatusSelect
            selected={status}
            options={statusOptions(
              fromDefaultCampaign ||
                !housing?.status ||
                +housing.status === HousingStatus.NeverContacted
                ? []
                : [HousingStatus.NeverContacted]
            )}
            onChange={(e: HousingStatus) => {
              selectStatus(e);
            }}
          />
        </div>
        {subStatusOptions && (
          <Select
            label="Sous-statut de suivi"
            options={subStatusOptions}
            selected={subStatus}
            messageType={form.messageType('subStatus') as 'valid' | 'error'}
            message={form.message('subStatus')}
            onChange={(e: any) => setSubStatus(e.target.value)}
            required
          />
        )}
        {housing && (
          <>
            <Text className="fr-mb-0">
              <b>Précisions</b>
              <br />
              Dispositifs ({(precisions ?? []).length}) / Points de blocage (
              {(vacancyReasons ?? []).length})
            </Text>
            <ButtonLink isSimple onClick={() => setIsPrecisionsModalOpen(true)}>
              Ajouter / Modifier
            </ButtonLink>
            {isPrecisionsModalOpen && (
              <PrecisionsModal
                currentPrecisions={precisions ?? []}
                currentVacancyReasons={vacancyReasons ?? []}
                onClose={() => setIsPrecisionsModalOpen(false)}
                onSubmit={(precisions, vacancyReasons) => {
                  setVacancyReasons(vacancyReasons);
                  setPrecisions(precisions);
                  setIsPrecisionsModalOpen(false);
                }}
              />
            )}
          </>
        )}
      </div>
      <div className="bg-white fr-py-2w fr-px-3w fr-my-1w">
        <Text size="lg" bold spacing="mb-2w">
          <Icon
            name="ri-home-gear-fill"
            size="lg"
            verticalAlign="middle"
            className="color-bf113"
          />
          Occupation 
          {pluralize(housingCount ?? 1, [{ old: 'du', new: 'des' }])(
            'du logement'
          )}
        </Text>
        <Row gutters>
          <Col>
            <Select
              label="Occupation actuelle"
              options={[
                { value: '', label: 'Sélectionnez une occupation actuelle' },
                ...allOccupancyOptions,
              ]}
              selected={occupancy}
              messageType={form.messageType('occupancy') as 'valid' | 'error'}
              message={form.message('occupancy')}
              onChange={(e: any) => setOccupancy(e.target.value)}
              required={housing !== undefined}
            />
            <Select
              label="Occupation prévisionnelle"
              options={[
                {
                  label: housing
                    ? "Pas d'informations"
                    : 'Sélectionnez une occupation prévisionnelle',
                  value: '',
                },
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
      <div className="bg-white fr-py-2w fr-px-3w">
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
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            setNoteKind(e.target.value)
          }
        />
      </div>
      {form.messageType('hasChange') === 'error' && (
        <Alert type="error" description={form.message('hasChange')} />
      )}
      {isConfirmationModalOpen && housingCount && (
        <ConfirmationModal
          onSubmit={submitForm}
          onClose={() => setIsConfirmationModalOpen(false)}
          title={`Vous êtes sur le point de mettre à jour ${housingCount} logements`}
          icon=""
        >
          En confirmant, vous écraserez et remplacerez les données actuelles sur
          les champs suivants :
          <ul className="fr-mt-2w">
            {status !== undefined && (
              <li>Mobilisation du logement - Statut de suivi</li>
            )}
            {subStatus !== undefined && (
              <li>Mobilisation du logement - Sous-statut de suivi</li>
            )}
            {occupancy !== undefined && (
              <li>Occupation du logement - Occupation actuelle</li>
            )}
            {occupancyIntended !== undefined && (
              <li>Occupation du logement - Occupation prévisionnelle</li>
            )}
            {hasNote && <li>Ajout d’une note</li>}
          </ul>
        </ConfirmationModal>
      )}
    </>
  );
};

export default React.forwardRef(HousingEditionForm);
