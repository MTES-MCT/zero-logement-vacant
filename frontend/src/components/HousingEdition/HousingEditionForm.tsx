import React, {
  useImperativeHandle,
  useState,
  forwardRef,
  useMemo,
} from 'react';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import Tabs from '@codegouvfr/react-dsfr/Tabs';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import {
  HOUSING_STATUS_VALUES,
  HousingStatus,
  Occupancy,
} from '@zerologementvacant/models';
import { Housing, HousingUpdate } from '../../models/Housing';
import { getSubStatusOptions } from '../../models/HousingState';
import {
  FormProvider,
  useForm,
  useController,
  Controller,
} from 'react-hook-form';
import { Col, Container, Row } from '../_dsfr';
import HousingStatusSelect from '../HousingListFilters/HousingStatusSelect';
import HousingSubStatusSelect from '../HousingListFilters/HousingSubStatusSelect';
import OccupancySelect from '../HousingListFilters/OccupancySelect';
import AppTextInputNext from '../_app/AppTextInput/AppTextInputNext';
import { HousingEditionFormSchema } from './HousingEditionSideMenu';

const modal = createModal({ id: 'housing-edition-modal', isOpenedByDefault: false });

interface Props {
  housing?: Housing;
  housingCount?: number;
  onSubmit: (housingUpdate: HousingUpdate) => void;
}

const HousingEditionForm = forwardRef(function HousingEditionForm(
  { housing, housingCount, onSubmit }: Props,
  ref: React.Ref<{ submit: () => void }>,
) {
  const rhfMethods = useForm<HousingEditionFormSchema>({
    defaultValues: {
      occupancy: housing?.occupancy ?? Occupancy.UNKNOWN,
      occupancyIntended: housing?.occupancyIntended ?? Occupancy.UNKNOWN,
      status: housing?.status ?? HousingStatus.NEVER_CONTACTED,
      subStatus: housing?.subStatus ?? null,
      note: '',
    },
    mode: 'onSubmit',
  });
  const { control, setValue, clearErrors, watch } = rhfMethods;

  const [occupancy, setOccupancy] = useState<Occupancy | undefined>(housing?.occupancy);
  const [occupancyIntended, setOccupancyIntended] = useState<Occupancy | undefined>(
    housing?.occupancyIntended ?? undefined,
  );

  const [showHasChangeError, setShowHasChangeError] = useState(false);

  const {
    field: statusField,
    fieldState: statusFieldState,
  } = useController<HousingEditionFormSchema, 'status'>({ name: 'status', control });

  const {
    field: subStatusField,
    fieldState: subStatusFieldState,
  } = useController<HousingEditionFormSchema, 'subStatus'>({ name: 'subStatus', control });

  const subStatusDisabled =
    !getSubStatusOptions(statusField.value as HousingStatus) ||
    statusField.value === HousingStatus.NEVER_CONTACTED ||
    statusField.value === HousingStatus.WAITING;

  const noteValue = watch('note');
  const hasNote = !!noteValue && noteValue.length > 0;

  const isOccupancyUpdate = () =>
    housing
      ? housing.occupancy !== occupancy || housing.occupancyIntended !== occupancyIntended
      : occupancy !== undefined || occupancyIntended !== undefined;

  const isStatusDirty = statusFieldState.isDirty;
  const isSubStatusDirty = subStatusFieldState.isDirty;

  const hasChange =
    isStatusDirty || isSubStatusDirty || isOccupancyUpdate() || hasNote;

  const submitForm = () => {
    onSubmit({
      statusUpdate:
        isStatusDirty || isSubStatusDirty
          ? {
              status: +(statusField.value ?? HousingStatus.WAITING),
              subStatus: subStatusField.value,
            }
          : undefined,
      occupancyUpdate: isOccupancyUpdate()
        ? {
            occupancy: occupancy ?? Occupancy.UNKNOWN,
            occupancyIntended: occupancyIntended ?? null,
          }
        : undefined,
      note: hasNote ? { content: noteValue } : undefined,
    });

    modal.close();
  };

  useImperativeHandle(ref, () => ({
    submit: () => {
      if (!hasChange) {
        setShowHasChangeError(true);
        return;
      }
      setShowHasChangeError(false);

      if (housingCount) {
        modal.open();
      } else {
        submitForm();
      }
    },
  }));

  const MobilizationTab = () => (
    <div className="fr-py-2w">
      <div className="fr-select-group">
        <HousingStatusSelect
          error={statusFieldState.error?.message}
          invalid={statusFieldState.invalid}
          options={HOUSING_STATUS_VALUES}
          value={statusField.value}
          onChange={(value) => {
            statusField.onChange(value);
            setValue('subStatus', null);
            clearErrors('subStatus');
          }}
        />
      </div>
      <HousingSubStatusSelect
        disabled={subStatusDisabled}
        multiple={false}
        grouped={false}
        options={
          getSubStatusOptions(statusField.value as HousingStatus)?.map(
            (o) => o.value
          ) ?? []
        }
        error={subStatusFieldState.error?.message}
        invalid={subStatusFieldState.invalid}
        value={subStatusField.value ?? null}
        onChange={subStatusField.onChange}
        onBlur={subStatusField.onBlur}
      />
    </div>
  );

  const OccupationTab = () => (
    <div className="bg-white fr-py-2w">
      <Row gutters>
        <Col>
          <OccupancySelect
            label="Occupation actuelle"
            value={occupancy ?? null}
            onChange={(value) => setOccupancy(value ?? undefined)}
          />
          <OccupancySelect
            label="Occupation prévisionnelle"
            value={occupancyIntended ?? null}
            onChange={(value) => setOccupancyIntended(value ?? undefined)}
          />
        </Col>
      </Row>
    </div>
  );

  const NoteTab = () => (
    <div className="bg-white">
      <Controller
        name="note"
        control={control}
        render={({ field }) => (
          <AppTextInputNext
            id="note-field"
            label="Nouvelle note"
            name={field.name}
            textArea
            nativeTextAreaProps={{ rows: 8, id: 'note-field', name: field.name }}
          />
        )}
      />
    </div>
  );

  const tabs = useMemo(
    () => [
      { label: 'Occupation', content: <OccupationTab /> },
      { label: 'Suivi', content: <MobilizationTab /> },
      { label: 'Note', content: <NoteTab /> },
    ],
    [
      subStatusDisabled,
      occupancy,
      occupancyIntended,
      statusField.value,
      subStatusField.value,
    ],
  );

  return (
    <FormProvider {...rhfMethods}>
      {showHasChangeError && (
        <Alert
          severity="error"
          small
          description='Pour enregistrer, veuillez saisir au moins une donnée. Sinon, cliquez sur "Annuler" ou sur "Fermer" pour quitter la mise à jour groupée.'
          className="fr-mb-2w"
        />
      )}

      <Tabs tabs={tabs} />

      <modal.Component
        title={`Vous êtes sur le point de mettre à jour ${housingCount} logement(s)`}
        buttons={[
          { children: 'Annuler', priority: 'secondary', className: 'fr-mr-2w' },
          { children: 'Confirmer', onClick: submitForm, doClosesModal: false },
        ]}
        style={{ textAlign: 'initial' }}
      >
        <Container as="section" fluid>
          En confirmant, vous écraserez et remplacerez les données actuelles sur les champs suivants :
          <ul className="fr-mt-2w">
            {isStatusDirty && <li>Suivi du logement – Statut de suivi</li>}
            {isSubStatusDirty && <li>Suivi du logement – Sous‑statut de suivi</li>}
            {occupancy !== undefined && <li>Occupation du logement – Occupation actuelle</li>}
            {occupancyIntended !== undefined && (
              <li>Occupation du logement – Occupation prévisionnelle</li>
            )}
            {hasNote && <li>Ajout d’une note</li>}
          </ul>
        </Container>
      </modal.Component>
    </FormProvider>
  );
});

export default HousingEditionForm;
