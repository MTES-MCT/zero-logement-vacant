import Button from '@codegouvfr/react-dsfr/Button';
import Tag from '@codegouvfr/react-dsfr/Tag';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import { skipToken } from '@reduxjs/toolkit/query/react';
import {
  isPrecisionBlockingPointCategory,
  isPrecisionEvolutionCategory,
  isPrecisionMechanismCategory,
  Precision
} from '@zerologementvacant/models';
import fp from 'lodash/fp';
import { useMemo, useState } from 'react';
import { useNotification } from '../../hooks/useNotification';
import { Housing } from '../../models/Housing';
import {
  useFindPrecisionsByHousingQuery,
  useFindPrecisionsQuery,
  useSaveHousingPrecisionsMutation
} from '../../services/precision.service';
import styles from '../HousingEdition/housing-edition.module.scss';
import createPrecisionModalNext from './PrecisionModalNext';
import { PrecisionTabId } from './PrecisionTabs';
import { useFilteredPrecisions } from './useFilteredPrecisions';

interface Props {
  housingId: Housing['id'] | null;
}

function PrecisionLists(props: Props) {
  const precisionModal = useMemo(
    () => createPrecisionModalNext(new Date().toJSON()),
    []
  );

  const [tab, setTab] = useState<PrecisionTabId>('dispositifs');
  const [showAllMechanisms, setShowAllMechanisms] = useState(false);
  const [showAllBlockingPoints, setShowAllBlockingPoints] = useState(false);
  const [showAllEvolutions, setShowAllEvolutions] = useState(false);

  const { data: referential } = useFindPrecisionsQuery();
  const { data: housingPrecisions } = useFindPrecisionsByHousingQuery(
    props.housingId ? { housingId: props.housingId } : skipToken
  );
  const precisionOptions = referential ?? [];
  const precisions = housingPrecisions ?? [];

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

  function toggleShowAll(
    setShowAll: React.Dispatch<React.SetStateAction<boolean>>
  ): void {
    setShowAll((prev) => !prev);
  }

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
    <>
      <Stack spacing="1rem">
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
            {filteredMechanisms.length === 0 ? (
              <Typography>Aucun dispositif</Typography>
            ) : (
              filteredMechanisms.map((precision) => (
                <Tag key={precision.id} className={styles.tag}>
                  {precision.label}
                </Tag>
              ))
            )}
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
            {filteredBlockingPoints.length === 0 ? (
              <Typography>Aucun point de blocage</Typography>
            ) : (
              filteredBlockingPoints.map((precision) => (
                <Tag key={precision.id} className={styles.tag}>
                  {precision.label}
                </Tag>
              ))
            )}
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
            {filteredEvolutions.length === 0 ? (
              <Typography>Aucune évolution</Typography>
            ) : (
              filteredEvolutions.map((precision) => (
                <Tag key={precision.id} className={styles.tag}>
                  {fp.startCase(precision.category.replace('-', ' '))} :&nbsp;
                  {precision.label.toLowerCase()}
                </Tag>
              ))
            )}
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
      </Stack>

      <precisionModal.Component
        tab={tab}
        options={precisionOptions}
        value={precisions}
        onSubmit={savePrecisions}
        onTabChange={setTab}
      />
    </>
  );
}

export default PrecisionLists;
