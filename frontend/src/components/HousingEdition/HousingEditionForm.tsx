import React, { useEffect, useImperativeHandle, useState } from 'react';
import { Col, Container, Icon, Row, Text } from '../_dsfr';
import { Housing, HousingUpdate, OccupancyKind } from '../../models/Housing';
import { getSubStatusOptions, HousingStatus } from '../../models/HousingState';
import { SelectOption } from '../../models/SelectOption';

import * as yup from 'yup';
import { allOccupancyOptions, statusOptions } from '../../models/HousingFilters';
import HousingStatusSelect from './HousingStatusSelect';
import { useForm } from '../../hooks/useForm';
import AppTextInput from '../_app/AppTextInput/AppTextInput';
import _ from 'lodash';
import PrecisionsModal from '../modals/PrecisionsModal/PrecisionsModal';
import { pluralize } from '../../utils/stringUtils';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import AppSelect from '../_app/AppSelect/AppSelect';
import { createModal } from '@codegouvfr/react-dsfr/Modal';

const modal = createModal({
  id: `housing-edition-modal`,
  isOpenedByDefault: false,
});

interface Props {
  housing?: Housing;
  housingCount?: number;
  onSubmit: (housingUpdate: HousingUpdate) => void;
}

const MultiHousingOccupancyDefaultValue = '-1';

const HousingEditionForm = (
  { housing, housingCount, onSubmit }: Props,
  ref: any
) => {
  const [occupancy, setOccupancy] = useState(
    housing ? housing?.occupancy : MultiHousingOccupancyDefaultValue
  );
  const [occupancyIntended, setOccupancyIntended] = useState(
    housing ? housing?.occupancyIntended : MultiHousingOccupancyDefaultValue
  );
  const [status, setStatus] = useState<HousingStatus>();
  const [subStatus, setSubStatus] = useState(housing?.subStatus);
  const [precisions, setPrecisions] = useState(housing?.precisions);
  const [vacancyReasons, setVacancyReasons] = useState(housing?.vacancyReasons);
  const [subStatusOptions, setSubStatusOptions] = useState<SelectOption[]>();
  const [comment, setComment] = useState<string>();
  const [noteKind, setNoteKind] = useState<string>();

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
    occupancy: yup.string().nullable(),
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

  const isOccupancyUpdate = () => {
    if (housing) {
      return (
        housing?.occupancy !== occupancy ||
        housing?.occupancyIntended !== occupancyIntended
      );
    } else {
      return (
        occupancy !== MultiHousingOccupancyDefaultValue ||
        occupancyIntended !== MultiHousingOccupancyDefaultValue
      );
    }
  };

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
      [housing, status].some((prop) => prop !== undefined) ||
      [occupancy, occupancyIntended].some(
        (prop) => prop !== MultiHousingOccupancyDefaultValue
      ) ||
      hasNote,
  });

  useImperativeHandle(ref, () => ({
    submit: async () => {
      await form.validate(() => (housingCount ? modal.open() : submitForm()));
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
      occupancyUpdate: isOccupancyUpdate()
        ? {
            occupancy:
              occupancy === MultiHousingOccupancyDefaultValue
                ? undefined
                : (occupancy as OccupancyKind),
            occupancyIntended:
              occupancyIntended === MultiHousingOccupancyDefaultValue
                ? undefined
                : (occupancyIntended as OccupancyKind),
          }
        : undefined,
      note: hasNote
        ? {
            content: comment,
            noteKind: noteKind!,
          }
        : undefined,
    });
    modal.close();
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
            name="fr-icon-information-fill"
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
              (housing?.campaignIds ?? []).length === 0
                ? []
                : [HousingStatus.NeverContacted]
            )}
            onChange={(e: HousingStatus) => {
              selectStatus(e);
            }}
          />
        </div>
        {subStatusOptions && (
          <AppSelect<FormShape>
            onChange={(e) => setSubStatus(e.target.value)}
            value={subStatus}
            required
            label="Sous-statut de suivi"
            inputForm={form}
            inputKey="subStatus"
            options={subStatusOptions}
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
            <PrecisionsModal
              currentPrecisions={precisions ?? []}
              currentVacancyReasons={vacancyReasons ?? []}
              onSubmit={(precisions, vacancyReasons) => {
                setVacancyReasons(vacancyReasons);
                setPrecisions(precisions);
              }}
            />
          </>
        )}
      </div>
      <div className="bg-white fr-py-2w fr-px-3w fr-my-1w">
        <Text size="lg" bold spacing="mb-2w">
          <Icon
            name="fr-icon-home-4-fill"
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
            <AppSelect<FormShape>
              onChange={(e) => setOccupancy(e.target.value as OccupancyKind)}
              value={occupancy}
              required={housing !== undefined}
              label="Occupation actuelle"
              inputForm={form}
              inputKey="occupancy"
              options={[
                ...(housing
                  ? []
                  : [
                      {
                        label: 'Sélectionnez une occupation actuelle',
                        value: MultiHousingOccupancyDefaultValue,
                        disabled: true,
                      },
                    ]),
                ...allOccupancyOptions,
              ]}
            />
            <AppSelect<FormShape>
              onChange={(e) =>
                setOccupancyIntended(e.target.value as OccupancyKind)
              }
              value={occupancyIntended}
              label="Occupation prévisionnelle"
              inputForm={form}
              inputKey="occupancyIntended"
              options={[
                ...(housing
                  ? []
                  : [
                      {
                        label: 'Sélectionnez une occupation prévisionnelle',
                        value: MultiHousingOccupancyDefaultValue,
                        disabled: true,
                      },
                    ]),
                ...allOccupancyOptions,
              ]}
            />
          </Col>
        </Row>
      </div>
      <div className="bg-white fr-py-2w fr-px-3w">
        <Text size="lg" bold spacing="mb-2w">
          Note
        </Text>
        <AppTextInput<FormShape>
          textArea
          rows={3}
          onChange={(e) => setComment(e.target.value)}
          inputForm={form}
          inputKey="comment"
          placeholder="Tapez votre note ici..."
        />
        <AppSelect<FormShape>
          onChange={(e) => setNoteKind(e.target.value)}
          value={noteKind}
          label="Type de note"
          inputForm={form}
          inputKey="noteKind"
          options={notesOptions}
        />
      </div>
      {form.messageType('hasChange') === 'error' && (
        <Alert
          severity="error"
          small
          description={form.message('hasChange')!}
        />
      )}
      <modal.Component
        title={`Vous êtes sur le point de mettre à jour ${housingCount} logements`}
        buttons={[
          {
            children: 'Annuler',
            priority: 'secondary',
            className: 'fr-mr-2w',
          },
          {
            children: 'Confirmer',
            onClick: submitForm,
            doClosesModal: false,
          },
        ]}
        style={{ textAlign: 'initial' }}
      >
        <Container as="section" fluid>
          En confirmant, vous écraserez et remplacerez les données actuelles sur
          les champs suivants :
          <ul className="fr-mt-2w">
            {status !== undefined && (
              <li>Mobilisation du logement - Statut de suivi</li>
            )}
            {subStatus !== undefined && (
              <li>Mobilisation du logement - Sous-statut de suivi</li>
            )}
            {occupancy !== MultiHousingOccupancyDefaultValue && (
              <li>Occupation du logement - Occupation actuelle</li>
            )}
            {occupancyIntended !== MultiHousingOccupancyDefaultValue && (
              <li>Occupation du logement - Occupation prévisionnelle</li>
            )}
            {hasNote && <li>Ajout d’une note</li>}
          </ul>
        </Container>
      </modal.Component>
    </>
  );
};

export default React.forwardRef(HousingEditionForm);
