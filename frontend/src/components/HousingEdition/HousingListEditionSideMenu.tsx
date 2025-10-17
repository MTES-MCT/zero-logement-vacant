import Tabs from '@codegouvfr/react-dsfr/Tabs';
import { yupResolver } from '@hookform/resolvers/yup';
import { Stack, Typography } from '@mui/material';
import {
  HOUSING_STATUS_VALUES,
  HousingStatus,
  Occupancy,
  OCCUPANCY_VALUES
} from '@zerologementvacant/models';
import { useState } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { match } from 'ts-pattern';
import * as yup from 'yup';

import type { Selection } from '~/hooks/useSelection';
import { HousingStates } from '../../models/HousingState';
import { displayCount } from '../../utils/stringUtils';
import AsideNext from '../Aside/AsideNext';
import OccupancySelect from '../HousingListFilters/OccupancySelect';
import LabelNext from '../Label/LabelNext';
import AppTextInputNext from '../_app/AppTextInput/AppTextInputNext';
import { createConfirmationModal } from '../modals/ConfirmationModal/ConfirmationModalNext';
import HousingEditionMobilizationTab from './HousingEditionMobilizationTab';

const WIDTH = '700px';

const schema = yup.object({
  occupancy: yup
    .string()
    .nullable()
    .optional()
    .default(null)
    .oneOf([...OCCUPANCY_VALUES, null]),
  occupancyIntended: yup
    .string()
    .nullable()
    .optional()
    .default(null)
    .oneOf([...OCCUPANCY_VALUES, null]),
  status: yup
    .number()
    .nullable()
    .optional()
    .default(null)
    .oneOf([...HOUSING_STATUS_VALUES, null]),
  subStatus: yup
    .string()
    .trim()
    .nullable()
    .optional()
    .when('status', {
      is: (status: HousingStatus) =>
        HousingStates.find((state) => state.status === status)?.subStatusList
          ?.length,
      then: (schema) =>
        schema.required('Veuillez renseigner le sous-statut de suivi'),
      otherwise: (schema) => schema.nullable().optional().default(null)
    }),
  note: yup.string().trim().nullable().optional().default(null)
});

const modal = createConfirmationModal({
  id: 'housing-list-edition-modal',
  isOpenedByDefault: false
});

export type BatchEditionFormSchema = yup.InferType<typeof schema>;

interface Props {
  count: number;
  selected: Selection;
  open: boolean;
  onSubmit(payload: BatchEditionFormSchema): void;
  onClose(): void;
}

function HousingListEditionSideMenu(props: Props) {
  const form = useForm<BatchEditionFormSchema>({
    defaultValues: {
      occupancy: null,
      occupancyIntended: null,
      status: null,
      subStatus: null,
      note: null
    },
    mode: 'onSubmit',
    resolver: yupResolver(schema)
  });

  // Tabs state: 'occupancy', 'mobilization', 'note'
  const [tab, setTab] = useState<'occupancy' | 'mobilization' | 'note'>(
    'occupancy'
  );

  async function save(): Promise<void> {
    if (!Object.values(form.formState.dirtyFields).some(Boolean)) {
      props.onClose();
      form.reset();
      return;
    }

    const isValid = await form.trigger();
    if (isValid) {
      modal.open();
    }
  }

  function submit(data: BatchEditionFormSchema) {
    props.onSubmit({
      occupancy: data.occupancy as Occupancy | null,
      occupancyIntended: data.occupancyIntended as Occupancy | null,
      status: data.status as HousingStatus | null,
      subStatus: data.subStatus,
      note: data.note
    });
    props.onClose();
    form.reset();
  }

  // Tab content logic using ts-pattern
  const content = match(tab)
    .with('occupancy', () => (
      <Stack rowGap={2}>
        <Controller<BatchEditionFormSchema, 'occupancy'>
          name="occupancy"
          render={({ field, fieldState }) => (
            <OccupancySelect
              label="Occupation actuelle"
              disabled={field.disabled}
              error={fieldState.error?.message}
              invalid={fieldState.invalid}
              value={field.value as Occupancy | null}
              onChange={field.onChange}
            />
          )}
        />
        <Controller<BatchEditionFormSchema, 'occupancyIntended'>
          name="occupancyIntended"
          render={({ field, fieldState }) => (
            <OccupancySelect
              label="Occupation prévisionnelle"
              disabled={field.disabled}
              error={fieldState.error?.message}
              invalid={fieldState.invalid}
              value={field.value as Occupancy | null}
              onChange={field.onChange}
            />
          )}
        />
      </Stack>
    ))
    .with('mobilization', () => (
      <HousingEditionMobilizationTab housingId={null} />
    ))
    .with('note', () => (
      <AppTextInputNext<string | null>
        label="Nouvelle note"
        name="note"
        nativeTextAreaProps={{
          rows: 8
        }}
        mapValue={(value) => value ?? ''}
        contramapValue={(value) => (value === '' ? null : value)}
        textArea
      />
    ))
    .exhaustive();

  return (
    <AsideNext
      drawerProps={{
        sx: (theme) => ({
          zIndex: theme.zIndex.appBar + 1,
          '& .MuiDrawer-paper': {
            px: '1.5rem',
            py: '2rem',
            width: WIDTH
          }
        })
      }}
      header={
        <Stack component="header">
          <LabelNext>Mise à jour groupée</LabelNext>
          <Typography variant="h6">
            {displayCount(props.count, 'logement sélectionné')}
          </Typography>
        </Stack>
      }
      main={
        <FormProvider {...form}>
          <Tabs
            tabs={[
              { tabId: 'occupancy', label: 'Occupation' },
              { tabId: 'mobilization', label: 'Suivi' },
              { tabId: 'note', label: 'Note' }
            ]}
            selectedTabId={tab}
            onTabChange={(tabId: string) => setTab(tabId as typeof tab)}
          >
            {content}
          </Tabs>

          <modal.Component
            title={`Vous êtes sur le point de mettre à jour ${props.count} logements`}
            onSubmit={form.handleSubmit(submit)}
          >
            <Stack spacing={2}>
              <Typography>
                En confirmant, vous écraserez et remplacerez les données
                actuelles sur les champs suivants :
              </Typography>
              <ul>
                {form.formState.dirtyFields.status && (
                  <li>Suivi du logement — Statut de suivi</li>
                )}
                {form.formState.dirtyFields.subStatus && (
                  <li>Suivi du logement — Sous-statut de suivi</li>
                )}
                {form.formState.dirtyFields.occupancy && (
                  <li>Occupation du logement — Occupation actuelle</li>
                )}
                {form.formState.dirtyFields.occupancyIntended && (
                  <li>Occupation du logement — Occupation prévisionnelle</li>
                )}
                {form.formState.dirtyFields.note && <li>Ajout d’une note</li>}
              </ul>
            </Stack>
          </modal.Component>
        </FormProvider>
      }
      open={props.open}
      onClose={props.onClose}
      onSave={save}
    />
  );
}

export default HousingListEditionSideMenu;
