import Button from '@codegouvfr/react-dsfr/Button';
import Tabs, { TabsProps } from '@codegouvfr/react-dsfr/Tabs';
import Tag from '@codegouvfr/react-dsfr/Tag';
import { yupResolver } from '@hookform/resolvers/yup';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { fromJS } from 'immutable';
import fp from 'lodash/fp';
import { FormProvider, useController, useForm } from 'react-hook-form';
import { ElementOf } from 'ts-essentials';
import * as yup from 'yup';
import styles from './housing-edition.module.scss';

import {
  HOUSING_STATUS_VALUES,
  HousingStatus,
  isPrecisionBlockingPointCategory,
  isPrecisionEvolutionCategory,
  isPrecisionMechanismCategory,
  Occupancy,
  OCCUPANCY_VALUES,
  Precision,
  PrecisionCategory
} from '@zerologementvacant/models';
import { Housing, HousingUpdate } from '../../models/Housing';
import AppLink from '../_app/AppLink/AppLink';
import AsideNext from '../Aside/AsideNext';
import LabelNext from '../Label/LabelNext';
import AppSelectNext from '../_app/AppSelect/AppSelectNext';
import {
  allOccupancyOptions,
  statusOptions
} from '../../models/HousingFilters';
import HousingStatusSelect from './HousingStatusSelect';
import { getSubStatusOptions, HousingStates } from '../../models/HousingState';
import AppTextInputNext from '../_app/AppTextInput/AppTextInputNext';
import { useCreateNoteByHousingMutation } from '../../services/note.service';
import { useUpdateHousingNextMutation } from '../../services/housing.service';
import { useNotification } from '../../hooks/useNotification';
import { toNewPrecision } from '../../models/Precision';
import createPrecisionModalNext from '../Precision/PrecisionModalNext';
import React, { useState } from 'react';
import { PrecisionTabId } from '../Precision/PrecisionTabs';
import { useFindPrecisionsQuery } from '../../services/precision.service';
import { isNotNull } from '@zerologementvacant/utils';

interface HousingEditionSideMenuProps {
  housing: Housing | null;
  expand: boolean;
  onSubmit?: (housing: Housing, housingUpdate: HousingUpdate) => void;
  onClose: () => void;
}

const WIDTH = '700px';
const DISPLAY_TAGS = 6;

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

type FormSchema = yup.InferType<typeof schema>;

const precisionModal = createPrecisionModalNext();

function HousingEditionSideMenu(props: HousingEditionSideMenuProps) {
  const { housing, expand, onClose } = props;
  const [showAllMechanisms, setShowAllMechanisms] = useState(false);
  const [showAllBlockingPoints, setShowAllBlockingPoints] = useState(false);
  const [showAllEvolutions, setShowAllEvolutions] = useState(false);

  const form = useForm<FormSchema>({
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
      success: 'Note créée !'
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

  const { data } = useFindPrecisionsQuery();
  const precisionOptions = data ?? [];
  const precisions =
    housing?.precisions?.length && precisionOptions.length
      ? housing.precisions
          .concat(housing?.vacancyReasons ?? [])
          // Only keep the well formed precisions and vacancy reasons
          // like `Dispositifs > Dispositifs incitatifs > Réserve personnelle ou pour une autre personne`
          .filter((precision) => precision.split(' > ').length === 3)
          .map((precision) => toNewPrecision(precisionOptions, precision))
          .filter(isNotNull)
      : [];

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
          subStatus: payload.subStatus,
          precisions: precisions.map((p) => p.id)
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

  interface UseFilteredPrecisionsResult {
    totalCount: number;
    filteredItems: Precision[];
    remainingCount: number;
  }

  function useFilteredPrecisions(
    categoryFilter: (category: PrecisionCategory) => boolean,
    showAll: boolean
  ): UseFilteredPrecisionsResult {
    const allItems = precisions.filter((precision) =>
      categoryFilter(precision.category)
    );

    return {
      totalCount: allItems.length,
      filteredItems: allItems.slice(
        0,
        showAll ? allItems.length : DISPLAY_TAGS
      ),
      remainingCount: Math.max(0, allItems.length - DISPLAY_TAGS)
    };
  }

  function OccupationTab(): ElementOf<TabsProps.Uncontrolled['tabs']> {
    return {
      content: (
        <Stack rowGap={2}>
          <AppSelectNext
            label="Occupation actuelle"
            multiple={false}
            name="occupancy"
            options={allOccupancyOptions}
          />
          <AppSelectNext
            label="Occupation prévisionnelle"
            multiple={false}
            name="occupancyIntended"
            options={allOccupancyOptions}
          />
        </Stack>
      ),
      isDefault: true,
      label: 'Occupation'
    };
  }

  function MobilisationTab(): ElementOf<TabsProps.Uncontrolled['tabs']> {
    const {
      totalCount: totalMechanisms,
      filteredItems: filteredMechanisms,
      remainingCount: moreMechanisms
    } = useFilteredPrecisions(isPrecisionMechanismCategory, showAllMechanisms);

    const {
      totalCount: totalBlockingPoints,
      filteredItems: filteredBlockingPoints,
      remainingCount: moreBlockingPoints
    } = useFilteredPrecisions(
      isPrecisionBlockingPointCategory,
      showAllBlockingPoints
    );

    const {
      totalCount: totalEvolutions,
      filteredItems: filteredEvolutions,
      remainingCount: moreEvolutions
    } = useFilteredPrecisions(isPrecisionEvolutionCategory, showAllEvolutions);

    interface ToggleShowAllProps {
      setShowAll: React.Dispatch<React.SetStateAction<boolean>>;
    }

    function toggleShowAll({ setShowAll }: ToggleShowAllProps): void {
      setShowAll((prev) => !prev);
    }

    const [tab, setTab] = useState<PrecisionTabId>('dispositifs');

    const { field: statusField, fieldState: statusFieldState } =
      useController<FormSchema>({
        name: 'status',
        control: form.control
      });

    // Immediately save the selected precisions
    function savePrecisions(precisions: Precision[]) {
      if (housing) {
        updateHousing({
          ...housing,
          occupancy: housing.occupancy as Occupancy,
          occupancyIntended: housing.occupancyIntended as Occupancy,
          precisions: precisions.map((p) => p.id)
        });
      }
    }

    const subStatusDisabled =
      getSubStatusOptions(statusField.value as HousingStatus) === undefined;

    return {
      content: (
        <Grid component="section" container sx={{ rowGap: 2 }}>
          <Grid
            component="article"
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
            xs={12}
          >
            <Typography
              component="h3"
              sx={{ fontSize: '1.125rem', fontWeight: 700 }}
            >
              Statut de suivi
            </Typography>
            <HousingStatusSelect
              selected={statusField.value as HousingStatus}
              message={statusFieldState.error?.message}
              messageType={statusFieldState.invalid ? 'error' : 'default'}
              options={statusOptions()}
              onChange={(status) => {
                statusField.onChange(status);
                form.setValue('subStatus', null);
                form.clearErrors('subStatus');
              }}
            />
            <AppSelectNext
              disabled={subStatusDisabled}
              label="Sous-statut de suivi"
              name="subStatus"
              multiple={false}
              options={
                getSubStatusOptions(statusField.value as HousingStatus) ?? []
              }
            />
          </Grid>

          <Grid
            component="article"
            container
            sx={{ alignItems: 'center', columnGap: 2, rowGap: 1 }}
            xs={12}
          >
            <Grid
              sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
              xs={12}
            >
              <Typography
                component="h3"
                sx={{
                  display: 'inline-block',
                  fontSize: '1.125rem',
                  fontWeight: 700
                }}
              >
                Dispositifs ({totalMechanisms})
              </Typography>
              <Button
                priority="secondary"
                title="Modifier les dispositifs"
                onClick={() => {
                  setTab('dispositifs');
                  precisionModal.open();
                }}
              >
                Modifier
              </Button>
            </Grid>
            <Grid>
              {filteredMechanisms.map((precision) => (
                <Tag key={precision.id} className={styles.tag}>
                  {precision.label}
                </Tag>
              ))}
            </Grid>
            {moreMechanisms > 0 && (
              <Grid component="footer">
                <Button
                  priority="tertiary"
                  onClick={() =>
                    toggleShowAll({ setShowAll: setShowAllMechanisms })
                  }
                >
                  {showAllMechanisms
                    ? 'Afficher moins'
                    : `Afficher plus (${moreMechanisms})`}
                </Button>
              </Grid>
            )}
          </Grid>

          <Grid
            component="article"
            container
            sx={{ alignItems: 'center', columnGap: 2, rowGap: 1 }}
            xs={12}
          >
            <Grid
              sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
              xs={12}
            >
              <Typography
                component="h3"
                sx={{
                  display: 'inline-block',
                  fontSize: '1.125rem',
                  fontWeight: 700
                }}
              >
                Points de blocages ({totalBlockingPoints})
              </Typography>
              <Button
                priority="secondary"
                title="Modifier les points de blocage"
                onClick={() => {
                  setTab('points-de-blocage');
                  precisionModal.open();
                }}
              >
                Modifier
              </Button>
            </Grid>
            <Grid>
              {filteredBlockingPoints.map((precision) => (
                <Tag key={precision.id} className={styles.tag}>
                  {precision.label}
                </Tag>
              ))}
            </Grid>
            {moreBlockingPoints > 0 && (
              <Grid component="footer">
                <Button
                  priority="tertiary"
                  onClick={() =>
                    toggleShowAll({ setShowAll: setShowAllBlockingPoints })
                  }
                >
                  {showAllBlockingPoints
                    ? 'Afficher moins'
                    : `Afficher plus (${moreBlockingPoints})`}
                </Button>
              </Grid>
            )}
          </Grid>

          <Grid
            component="article"
            container
            sx={{ alignItems: 'center', columnGap: 2, rowGap: 1 }}
            xs={12}
          >
            <Grid
              sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
              xs={12}
            >
              <Typography
                component="h3"
                sx={{ fontSize: '1.125rem', fontWeight: 700 }}
              >
                Évolutions du logement ({totalEvolutions})
              </Typography>
              <Button
                priority="secondary"
                title="Modifier les évolutions du logement"
                onClick={() => {
                  setTab('evolutions');
                  precisionModal.open();
                }}
              >
                Modifier
              </Button>
            </Grid>
            <Grid>
              {filteredEvolutions.map((precision) => (
                <Tag key={precision.id} className={styles.tag}>
                  {fp.startCase(precision.category.replace('-', ' '))} :&nbsp;
                  {precision.label.toLowerCase()}
                </Tag>
              ))}
            </Grid>
            {moreEvolutions > 0 && (
              <Grid component="footer">
                <Button
                  priority="tertiary"
                  onClick={() =>
                    toggleShowAll({ setShowAll: setShowAllEvolutions })
                  }
                >
                  {showAllEvolutions
                    ? 'Afficher moins'
                    : `Afficher plus (${moreEvolutions})`}
                </Button>
              </Grid>
            )}
          </Grid>

          <precisionModal.Component
            tab={tab}
            options={precisionOptions}
            value={precisions}
            onSubmit={savePrecisions}
            onTabChange={setTab}
          />
        </Grid>
      ),
      label: 'Mobilisation'
    };
  }

  function NoteTab(): ElementOf<TabsProps.Uncontrolled['tabs']> {
    return {
      content: (
        <AppTextInputNext
          label="Nouvelle note"
          name="note"
          nativeTextAreaProps={{ rows: 8 }}
          textArea
        />
      ),
      label: 'Note'
    };
  }

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
          <Tabs tabs={[OccupationTab(), MobilisationTab(), NoteTab()]} />
        </FormProvider>
      }
      open={expand}
      onClose={onClose}
      onSave={form.handleSubmit(submit)}
    />
  );
}

export default HousingEditionSideMenu;
