import React, { useImperativeHandle, useState, useEffect, useRef } from 'react';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import Tabs from '@codegouvfr/react-dsfr/Tabs';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import * as yup from 'yup';
import { HousingStatus } from '@zerologementvacant/models';
import { Housing, HousingUpdate, OccupancyKind } from '../../models/Housing';
import { getSubStatusOptions } from '../../models/HousingState';
import { SelectOption } from '../../models/SelectOption';
import { allOccupancyOptions, statusOptions } from '../../models/HousingFilters';
import { useForm } from '../../hooks/useForm';
import { Col, Container, Row } from '../_dsfr';
import HousingStatusSelect from './HousingStatusSelect';
import AppSelect from '../_app/AppSelect/AppSelect';
import AppTextInput from '../_app/AppTextInput/AppTextInput';

const modal = createModal({
  id: 'housing-edition-modal',
  isOpenedByDefault: false
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
  // Form state
  const [occupancy, setOccupancy] = useState(
    housing ? housing?.occupancy : MultiHousingOccupancyDefaultValue
  );
  const [occupancyIntended, setOccupancyIntended] = useState(
    housing ? housing?.occupancyIntended : MultiHousingOccupancyDefaultValue
  );
  const [status, setStatus] = useState<HousingStatus>();
  const [subStatus, setSubStatus] = useState(housing?.subStatus);
  const [subStatusOptions, setSubStatusOptions] = useState<SelectOption[]>();
  const noteRef = useRef<string>('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    noteRef.current = e.target.value;
  };

  useEffect(() => {
    if (housing) {
      selectStatus(housing.status ?? HousingStatus.WAITING);
    }
  }, [housing?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  function selectStatus(newStatus: HousingStatus): void {
    setStatus(+newStatus);
    setSubStatusOptions(getSubStatusOptions(newStatus));
    setSubStatus(
      getSubStatusOptions(newStatus)
        ?.map((_) => _.label)
        .find((_) => _ === subStatus)
    );
  }

  const shape = {
    occupancy: yup.string().nullable(),
    occupancyIntended: yup.string().nullable(),
    status: yup
      .string()
      .nullable()
      .when('hasCurrent', {
        is: true,
        then: yup.string().required('Veuillez sélectionner un statut.')
      }),
    subStatus: yup
      .string()
      .nullable()
      .when('status', (statusVal: HousingStatus | null, schema) => {
        if (
          statusVal !== undefined &&
          statusVal !== HousingStatus.NEVER_CONTACTED &&
          statusVal !== HousingStatus.WAITING
        ) {
          console.log("erreur", statusVal)
          return schema.required('Veuillez sélectionner un sous-statut de suivi.');
        }
        return schema;
      }),
    note: yup.string(),
    hasChange: yup
      .boolean()
      .oneOf(
        [true],
        'Pour enregister, veuillez saisir au moins une donnée. Sinon, cliquez sur "Annuler" ou sur "Fermer" pour quitter la mise à jour groupée.'
      )
  };
  type FormShape = typeof shape;

  const isStatusUpdate = housing?.status !== status || housing?.subStatus !== subStatus;

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

  const hasNote = noteRef.current !== undefined && noteRef.current.length > 0;

  const form = useForm(yup.object().shape(shape), {
    occupancy,
    occupancyIntended,
    hasSubStatus: subStatusOptions !== undefined,
    hasCurrent: housing !== undefined,
    status,
    subStatus,
    note: '',
    hasChange:
      [housing, status].some((prop) => prop !== undefined) ||
      [occupancy, occupancyIntended].some(
        (prop) => prop !== MultiHousingOccupancyDefaultValue
      ) ||
      hasNote
  });

  useImperativeHandle(ref, () => ({
    submit: async () => {
      await form.validate(() => (housingCount ? modal.open() : submitForm()));
    }
  }));

  const submitForm = () => {
    onSubmit({
      statusUpdate: isStatusUpdate
        ? {
            status: +(status ?? HousingStatus.WAITING),
            subStatus
          }
        : undefined,
      occupancyUpdate: isOccupancyUpdate()
        ? {
            occupancy:
              occupancy === MultiHousingOccupancyDefaultValue
                ? Occupancy.UNKNOWN
                : (occupancy as Occupancy),
            occupancyIntended:
              occupancyIntended === MultiHousingOccupancyDefaultValue
                ? null
                : (occupancyIntended as Occupancy | null)
          }
        : undefined,
      note: noteRef.current ? { content: noteRef.current, noteKind: 'Note courante' } : undefined
    });

    modal.close();
  };

  const MobilizationTab = () => (
    <div className="fr-py-2w">
      {form.messageType('hasChange') === 'error' && (
        <Alert
          severity="error"
          small
          description={form.message('hasChange')!}
        />
      )}
      <div className="fr-select-group">
        <HousingStatusSelect
          selected={status}
          options={statusOptions(
            (housing?.campaignIds ?? []).length === 0
              ? []
              : [HousingStatus.NEVER_CONTACTED]
          )}
          onChange={(e: HousingStatus) => {
            selectStatus(e);
          }}
        />
      </div>
      {(subStatusOptions && ![HousingStatus.NEVER_CONTACTED, HousingStatus.WAITING].includes(status)) && (
        <AppSelect
          onChange={(e) => setSubStatus(e.target.value)}
          value={subStatus}
          required
          label="Sous-statut de suivi"
          inputForm={form}
          inputKey="subStatus"
          options={subStatusOptions}
        />
      )}
    </div>
  );

  const OccupationTab = () => (
    <div className="bg-white fr-py-2w">
      {form.messageType('hasChange') === 'error' && (
        <Alert
          severity="error"
          small
          description={form.message('hasChange')!}
        />
      )}
      <Row gutters>
        <Col>
          <AppSelect
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
                      disabled: true
                    }
                  ]),
              ...allOccupancyOptions
            ]}
          />
          <AppSelect
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
                      disabled: true
                    }
                  ]),
              ...allOccupancyOptions
            ]}
          />
        </Col>
      </Row>
    </div>
  );

  const NoteTab = () => (
    <>
      <label className="fr-label fr-mb-1w">Nouvelle note</label>
      <div className="bg-white">
        <AppTextInput<FormShape>
        textArea
        rows={8}
        defaultValue={noteRef.current}
        onChange={handleChange}
        inputForm={form}
        inputRef={textareaRef}
        inputKey="note"
        />
      </div>
    </>
  );

  return (
    <>
      <Tabs
        tabs={[
          {
            label: "Occupation",
            content: <OccupationTab />
          },
          {
            label: "Mobilisation",
            content: <MobilizationTab />
          },
          {
            label: "Note",
            content: <NoteTab />
          }
        ]}
      />

      <modal.Component
        title={`Vous êtes sur le point de mettre à jour ${housingCount} logements`}
        buttons={[
          {
            children: 'Annuler',
            priority: 'secondary',
            className: 'fr-mr-2w'
          },
          {
            children: 'Confirmer',
            onClick: submitForm,
            doClosesModal: false
          }
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
            {hasNote && <li>Ajout d'une note</li>}
          </ul>
        </Container>
      </modal.Component>
    </>
  );
};

export default React.forwardRef(HousingEditionForm);
