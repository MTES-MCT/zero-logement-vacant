import Tabs from '@codegouvfr/react-dsfr/Tabs';
import { yupResolver } from '@hookform/resolvers/yup';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import {
  HOUSING_STATUS_VALUES,
  HousingStatus,
  Occupancy,
  OCCUPANCY_VALUES
} from '@zerologementvacant/models';
import { fromJS } from 'immutable';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { match } from 'ts-pattern';
import * as yup from 'yup';
import { useNotification } from '../../hooks/useNotification';
import { Housing, HousingUpdate } from '../../models/Housing';
import { HousingStates } from '../../models/HousingState';
import { useUpdateHousingNextMutation } from '../../services/housing.service';
import { useCreateNoteByHousingMutation } from '../../services/note.service';
import AppLink from '../_app/AppLink/AppLink';
import AppTextInputNext from '../_app/AppTextInput/AppTextInputNext';
import OccupancySelect from '../HousingListFilters/OccupancySelect';
import AsideNext from '../Aside/AsideNext';
import LabelNext from '../Label/LabelNext';
import HousingEditionMobilizationTab from './HousingEditionMobilizationTab';
import { HousingEditionContext, useHousingEdition } from './useHousingEdition';

interface HousingEditionSideMenuProps {
  housing: Housing | null;
  expand: boolean;
  onSubmit?: (housing: Housing, housingUpdate: HousingUpdate) => void;
  onClose: () => void;
}

const WIDTH = '700px';

const schema = yup.object({
  occupancy: yup
    .string()
    .required('Veuillez renseigner l’occupation actuelle')
    .oneOf(OCCUPANCY_VALUES),
  occupancyIntended: yup
    .string()
    .oneOf(OCCUPANCY_VALUES)
    .nullable()
    .optional()
    .default(null),
  status: yup
    .number()
    .required('Veuillez renseigner le statut de suivi')
    .oneOf(HOUSING_STATUS_VALUES),
  subStatus: yup
    .string()
    .trim()
    .nullable()
    .when('status', {
      is: (status: HousingStatus) =>
        HousingStates.find((state) => state.status === status)?.subStatusList
          ?.length,
      then: (schema) =>
        schema.required('Veuillez renseigner le sous-statut de suivi'),
      otherwise: (schema) => schema.nullable().optional().default(null)
    }),
  note: yup.string()
});

export type HousingEditionFormSchema = yup.InferType<typeof schema>;

function HousingEditionSideMenu(props: HousingEditionSideMenuProps) {
  const { housing, expand, onClose } = props;
  const { tab, setTab } = useHousingEdition();

  const form = useForm<HousingEditionFormSchema>({
    values: {
      occupancy: props.housing?.occupancy ?? Occupancy.UNKNOWN,
      occupancyIntended: props.housing?.occupancyIntended ?? Occupancy.UNKNOWN,
      status: props.housing?.status ?? HousingStatus.NEVER_CONTACTED,
      subStatus: props.housing?.subStatus ?? null,
      note: ''
    },
    mode: 'onSubmit',
    resolver: yupResolver(schema)
  });

  const [createNote, noteCreationMutation] = useCreateNoteByHousingMutation();
  const [updateHousing, housingUpdateMutation] = useUpdateHousingNextMutation();

  useNotification({
    toastId: 'note-creation',
    isError: noteCreationMutation.isError,
    isLoading: noteCreationMutation.isLoading,
    isSuccess: noteCreationMutation.isSuccess,
    message: {
      error: 'Impossible de créer la note',
      loading: 'Création de la note...',
      success:
        'Votre note a été correctement créée et enregistrée dans la section "Historique et notes" du logement.'
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

  function submit() {
    if (housing) {
      const { note, ...payload } = form.getValues();

      const hasChanges = fromJS(form.formState.dirtyFields)
        .filterNot((_, key) => key === 'note')
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
    .with('mobilization', () => (
      <HousingEditionMobilizationTab housingId={housing?.id ?? null} />
    ))
    .with('note', () => (
      <AppTextInputNext
        label="Nouvelle note"
        name="note"
        nativeTextAreaProps={{ rows: 8 }}
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
              { tabId: 'occupancy', label: 'Occupation' },
              { tabId: 'mobilization', label: 'Mobilisation' },
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
