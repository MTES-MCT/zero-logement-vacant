import Tabs from '@codegouvfr/react-dsfr/Tabs';
import { yupResolver } from '@hookform/resolvers/yup';
import { Stack, Typography } from '@mui/material';
import {
  HOUSING_STATUS_VALUES,
  HousingStatus,
  Occupancy,
  OCCUPANCY_VALUES,
  PRECISION_CATEGORY_VALUES
} from '@zerologementvacant/models';
import { useState } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { match } from 'ts-pattern';
import { array, type InferType, number, object, string } from 'yup';

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

const schema = object({
  occupancy: string()
    .nullable()
    .optional()
    .default(null)
    .oneOf([...OCCUPANCY_VALUES, null]),
  occupancyIntended: string()
    .nullable()
    .optional()
    .default(null)
    .oneOf([...OCCUPANCY_VALUES, null]),
  status: number()
    .nullable()
    .optional()
    .default(null)
    .oneOf([...HOUSING_STATUS_VALUES, null]),
  subStatus: string()
    .trim()
    .nullable()
    .optional()
    .default(null)
    .when('status', ([status], schema) =>
      HousingStates.find((state) => state.status === status)?.subStatusList
        ?.length
        ? schema.required('Veuillez renseigner le sous-statut de suivi')
        : schema
    ),
  note: string().trim().nullable().optional().default(null),
  precisions: array()
    .of(
      object({
        id: string().required(),
        category: string().oneOf(PRECISION_CATEGORY_VALUES).required(),
        label: string().required()
      }).required()
    )
    .optional()
    .nullable()
    .default(null)
}).required();

const modal = createConfirmationModal({
  id: 'housing-list-edition-modal',
  isOpenedByDefault: false
});

export type BatchEditionFormSchema = InferType<typeof schema>;

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
      note: null,
      precisions: []
    },
    mode: 'onSubmit',
    resolver: yupResolver(schema)
  });

  const [tab, setTab] = useState<'occupancy' | 'mobilization' | 'note'>(
    'occupancy'
  );

  function close(): void {
    props.onClose();
    form.reset();
  }

  async function save(): Promise<void> {
    if (!Object.values(form.formState.dirtyFields).some(Boolean)) {
      close();
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
      note: data.note,
      precisions: data.precisions
    });
    close();
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
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </Stack>
    ))
    .with('mobilization', () => (
      <HousingEditionMobilizationTab
        precisionListProps={{ multiple: true, showNullOption: false }}
      />
    ))
    .with('note', () => (
      <AppTextInputNext<BatchEditionFormSchema>
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
      onClose={close}
      onSave={save}
    />
  );
}

export default HousingListEditionSideMenu;
