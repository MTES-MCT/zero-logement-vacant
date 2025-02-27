import Button from '@codegouvfr/react-dsfr/Button';
import Tag from '@codegouvfr/react-dsfr/Tag';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import { skipToken } from '@reduxjs/toolkit/query';

import {
  HousingStatus,
  isPrecisionBlockingPointCategory,
  isPrecisionEvolutionCategory,
  isPrecisionMechanismCategory,
  Precision
} from '@zerologementvacant/models';
import fp from 'lodash/fp';
import { Dispatch, SetStateAction, useState } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { useNotification } from '../../hooks/useNotification';
import { Housing } from '../../models/Housing';
import { statusOptions } from '../../models/HousingFilters';
import { getSubStatusOptions } from '../../models/HousingState';
import {
  useFindPrecisionsByHousingQuery,
  useFindPrecisionsQuery,
  useSaveHousingPrecisionsMutation
} from '../../services/precision.service';
import AppSelectNext from '../_app/AppSelect/AppSelectNext';
import createPrecisionModalNext from '../Precision/PrecisionModalNext';
import { PrecisionTabId } from '../Precision/PrecisionTabs';
import { useFilteredPrecisions } from '../Precision/useFilteredPrecisions';
import styles from './housing-edition.module.scss';
import { HousingEditionFormSchema } from './HousingEditionSideMenu';
import HousingStatusSelect from './HousingStatusSelect';

interface Props {
  housingId: Housing['id'] | null;
}

const precisionModal = createPrecisionModalNext();

function HousingEditionMobilizationTab(props: Props) {
  const { data: referential } = useFindPrecisionsQuery();
  const { data: housingPrecisions } = useFindPrecisionsByHousingQuery(
    props.housingId ? { housingId: props.housingId } : skipToken
  );
  const precisionOptions = referential ?? [];
  const precisions = housingPrecisions ?? [];

  const [saveHousingPrecisions, saveHousingPrecisionsMutation] =
    useSaveHousingPrecisionsMutation();
  useNotification({
    toastId: 'housing-precisions-update',
    isError: saveHousingPrecisionsMutation.isError,
    isLoading: saveHousingPrecisionsMutation.isLoading,
    isSuccess: saveHousingPrecisionsMutation.isSuccess,
    message: {
      error: 'Impossible de mettre à jour les précisions du logement',
      loading: 'Mise à jour des précisions du logement...',
      success: 'Précisions mises à jour !'
    }
  });

  const [tab, setTab] = useState<PrecisionTabId>('dispositifs');
  const [showAllMechanisms, setShowAllMechanisms] = useState(false);
  const [showAllBlockingPoints, setShowAllBlockingPoints] = useState(false);
  const [showAllEvolutions, setShowAllEvolutions] = useState(false);

  const {
    totalCount: totalMechanisms,
    filteredItems: filteredMechanisms,
    remainingCount: moreMechanisms
  } = useFilteredPrecisions(precisions, {
    predicate: isPrecisionMechanismCategory,
    showAll: showAllMechanisms
  });

  const {
    totalCount: totalBlockingPoints,
    filteredItems: filteredBlockingPoints,
    remainingCount: moreBlockingPoints
  } = useFilteredPrecisions(precisions, {
    predicate: isPrecisionBlockingPointCategory,
    showAll: showAllBlockingPoints
  });

  const {
    totalCount: totalEvolutions,
    filteredItems: filteredEvolutions,
    remainingCount: moreEvolutions
  } = useFilteredPrecisions(precisions, {
    predicate: isPrecisionEvolutionCategory,
    showAll: showAllEvolutions
  });

  function toggleShowAll(setShowAll: Dispatch<SetStateAction<boolean>>): void {
    setShowAll((prev) => !prev);
  }

  const form = useFormContext();
  const { field: statusField, fieldState: statusFieldState } = useController<
    HousingEditionFormSchema,
    'status'
  >({
    name: 'status'
  });
  const { field: subStatusField, fieldState: subStatusFieldState } =
    useController<HousingEditionFormSchema, 'subStatus'>({
      name: 'subStatus'
    });

  const subStatusDisabled =
    getSubStatusOptions(statusField.value as HousingStatus) === undefined;

  function savePrecisions(precisions: Precision[]) {
    if (props.housingId) {
      saveHousingPrecisions({
        housing: props.housingId,
        precisions: precisions.map((p) => p.id)
      }).then(() => {
        precisionModal.close();
      });
    }
  }

  return (
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
          name={subStatusField.name}
          multiple={false}
          options={
            getSubStatusOptions(statusField.value as HousingStatus)?.map(
              (option) => option.value
            ) ?? []
          }
          error={subStatusFieldState.error?.message}
          invalid={subStatusFieldState.invalid}
          ref={subStatusField.ref}
          value={subStatusField.value}
          onBlur={subStatusField.onBlur}
          onChange={subStatusField.onChange}
        />
      </Grid>

      <Grid
        component="article"
        container
        sx={{ alignItems: 'center', columnGap: 2, rowGap: 1 }}
        xs={12}
      >
        <Grid sx={{ display: 'flex', alignItems: 'center', gap: 2 }} xs={12}>
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
              onClick={() => toggleShowAll(setShowAllMechanisms)}
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
        <Grid sx={{ display: 'flex', alignItems: 'center', gap: 2 }} xs={12}>
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
              onClick={() => toggleShowAll(setShowAllBlockingPoints)}
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
        <Grid sx={{ display: 'flex', alignItems: 'center', gap: 2 }} xs={12}>
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
              onClick={() => toggleShowAll(setShowAllEvolutions)}
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
  );
}

export default HousingEditionMobilizationTab;
