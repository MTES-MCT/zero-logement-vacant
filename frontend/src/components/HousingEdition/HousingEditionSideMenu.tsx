import Tabs from '@codegouvfr/react-dsfr/Tabs';
import { yupResolver } from '@hookform/resolvers/yup';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { skipToken } from '@reduxjs/toolkit/query/react';
import {
  HOUSING_STATUS_VALUES,
  HousingStatus,
  Occupancy,
  OCCUPANCY_VALUES,
  PRECISION_CATEGORY_VALUES
} from '@zerologementvacant/models';
import { fromJS } from 'immutable';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { match } from 'ts-pattern';
import { array, number, object, string, type InferType } from 'yup';
import { useNotification } from '~/hooks/useNotification';
import { HousingStates } from '~/models/HousingState';
import { useUpdateHousingMutation } from '~/services/housing.service';
import { useCreateNoteByHousingMutation } from '~/services/note.service';
import {
  useFindPrecisionsByHousingQuery,
  useSaveHousingPrecisionsMutation
} from '~/services/precision.service';
import type { Housing, HousingUpdate } from '../../models/Housing';
import AppLink from '../_app/AppLink/AppLink';
import AsideNext from '../Aside/AsideNext';
import OccupancySelect from '../HousingListFilters/OccupancySelect';
import LabelNext from '../Label/LabelNext';
import HousingEditionMobilizationTab from './HousingEditionMobilizationTab';
import HousingEditionNoteTab from './HousingEditionNoteTab';
import type { HousingEditionContext } from './useHousingEdition';
import { useHousingEdition } from './useHousingEdition';

interface HousingEditionSideMenuProps {
  housing: Housing | null;
  expand: boolean;
  onSubmit?: (housing: Housing, housingUpdate: HousingUpdate) => void;
  onClose: () => void;
}

const WIDTH = '700px';

const schema = object({
  occupancy: string()
    .required("Veuillez renseigner l'occupation actuelle")
    .oneOf(OCCUPANCY_VALUES),
  occupancyIntended: string()
    .oneOf(OCCUPANCY_VALUES)
    .nullable()
    .optional()
    .default(null),
  status: number()
    .required('Veuillez renseigner le statut de suivi')
    .oneOf(HOUSING_STATUS_VALUES),
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
  note: string().default(null),
  precisions: array(
    object({
      id: string().required(),
      category: string().oneOf(PRECISION_CATEGORY_VALUES).required(),
      label: string().required()
    }).required()
  ).default([])
}).required();

export type HousingEditionFormSchema = InferType<typeof schema>;

function HousingEditionSideMenu(props: HousingEditionSideMenuProps) {
  const { housing, expand, onClose } = props;
  const { tab, setTab } = useHousingEdition();

  const { data: housingPrecisions } = useFindPrecisionsByHousingQuery(
    props.housing ? { housingId: props.housing.id } : skipToken
  );

  const form = useForm<HousingEditionFormSchema>({
    values: {
      occupancy: props.housing?.occupancy ?? Occupancy.UNKNOWN,
      occupancyIntended: props.housing?.occupancyIntended ?? Occupancy.UNKNOWN,
      status: props.housing?.status ?? HousingStatus.NEVER_CONTACTED,
      subStatus: props.housing?.subStatus ?? null,
      note: '',
      precisions: housingPrecisions ?? []
    },
    mode: 'onSubmit',
    resolver: yupResolver(schema)
  });

  const [createNote, noteCreationMutation] = useCreateNoteByHousingMutation();
  const [updateHousing, housingUpdateMutation] = useUpdateHousingMutation();
  const [saveHousingPrecisions, saveHousingPrecisionsMutation] =
    useSaveHousingPrecisionsMutation();

  useNotification({
    toastId: 'note-creation',
    isError: noteCreationMutation.isError,
    isLoading: noteCreationMutation.isLoading,
    isSuccess: noteCreationMutation.isSuccess,
    message: {
      error: 'Impossible de créer la note',
      loading: 'Création de la note...',
      success:
        'Votre note a été correctement créée et enregistrée dans la section "Notes et historique" du logement.'
    }
  });
  useNotification({
    toastId: 'housing-update',
    isError: housingUpdateMutation.isError,
    isLoading: housingUpdateMutation.isLoading,
    isSuccess: housingUpdateMutation.isSuccess,
    message: {
      error: 'Impossible de mettre à jour le logement',
      loading: 'Mise à jour du logement...',
      success: 'Logement mis à jour !'
    }
  });
  useNotification({
    toastId: 'housing-precisions-update',
    isError: saveHousingPrecisionsMutation.isError,
    isLoading: saveHousingPrecisionsMutation.isLoading,
    isSuccess: saveHousingPrecisionsMutation.isSuccess,
    message: {
      error: 'Impossible de modifier les précisions du logement',
      loading: 'Modification des précisions du logement...',
      success: 'Précisions du logement modifiées'
    }
  });

  function submit() {
    if (housing) {
      const { note, precisions, ...payload } = form.getValues();

      const hasChanges = fromJS(form.formState.dirtyFields)
        .filterNot((_, key) => key === 'note' || key === 'precisions')
        .some((value) => !!value);
      if (hasChanges) {
        updateHousing({
          ...housing,
          // TODO: directly pass payload whenever
          //  Housing and HousingDTO are aligned
          occupancy: payload.occupancy as Occupancy,
          occupancyIntended: payload.occupancyIntended as Occupancy | null,
          status: payload.status as HousingStatus,
          subStatus: payload.subStatus ?? null
        });
      }

      if (form.formState.dirtyFields.precisions) {
        saveHousingPrecisions({
          housing: housing.id,
          precisions: precisions.map((precision) => precision.id)
        });
      }

      if (note) {
        createNote({
          id: housing.id,
          content: note
        });
      }
    }

    onClose();
    form.reset();
  }

  const content = match(tab)
    .with('occupancy', () => (
      <Stack rowGap={2}>
        <Controller<HousingEditionFormSchema, 'occupancy'>
          name="occupancy"
          render={({ field, fieldState }) => (
            <OccupancySelect
              label="Occupation actuelle"
              disabled={field.disabled}
              error={fieldState.error?.message}
              invalid={fieldState.invalid}
              value={field.value as Occupancy}
              onChange={field.onChange}
            />
          )}
        />
        <Controller<HousingEditionFormSchema, 'occupancyIntended'>
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
    .with('mobilization', () => <HousingEditionMobilizationTab />)
    .with('note', () => (
      <HousingEditionNoteTab housingId={housing?.id ?? null} />
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
        <Box component="header">
          <Typography variant="h6">
            {props.housing?.rawAddress.join(' - ')}
          </Typography>
          <LabelNext>
            Identifiant fiscal national : {props.housing?.localId}
          </LabelNext>
          <AppLink
            style={{ display: 'block' }}
            to={`/logements/${props.housing?.id}`}
            isSimple
            target="_blank"
          >
            Voir la fiche logement dans un nouvel onglet
          </AppLink>
        </Box>
      }
      main={
        <FormProvider {...form}>
          <Tabs
            tabs={[
              { tabId: 'occupancy', label: 'Informations sur le logement' },
              { tabId: 'mobilization', label: 'Suivi' },
              { tabId: 'note', label: 'Note' }
            ]}
            selectedTabId={tab}
            onTabChange={(tab: string) => {
              setTab(tab as HousingEditionContext['tab']);
            }}
          >
            {content}
          </Tabs>
        </FormProvider>
      }
      open={expand}
      onClose={onClose}
      onSave={form.handleSubmit(submit)}
    />
  );
}

export default HousingEditionSideMenu;
