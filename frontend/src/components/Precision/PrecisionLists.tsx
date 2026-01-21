import Alert from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import Tag from '@codegouvfr/react-dsfr/Tag';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Precision } from '@zerologementvacant/models';
import {
  isPrecisionBlockingPointCategory,
  isPrecisionEvolutionCategory,
  isPrecisionMechanismCategory
} from '@zerologementvacant/models';
import { useMemo, useState } from 'react';

import { useFindPrecisionsQuery } from '../../services/precision.service';
import styles from '../HousingEdition/housing-edition.module.scss';
import createPrecisionModal, {
  type PrecisionModalProps
} from './PrecisionModal';
import type { PrecisionTabId } from './PrecisionTabs';
import { useFilteredPrecisions } from './useFilteredPrecisions';

interface WritableProps {
  /**
   * @default false
   */
  multiple?: boolean;
  writable?: true;
  showNullOption?: PrecisionModalProps['showNullOption'];
  value: ReadonlyArray<Precision>;
  onChange(precisions: ReadonlyArray<Precision>): void;
}

interface ReadOnlyProps {
  /**
   * @default false
   */
  multiple?: boolean;
  writable: false;
  showNullOption?: PrecisionModalProps['showNullOption'];
  value: ReadonlyArray<Precision>;
  onChange?: never;
}

export type PrecisionListProps = WritableProps | ReadOnlyProps;

function PrecisionLists(props: Readonly<PrecisionListProps>) {
  const precisionModal = useMemo(
    () => createPrecisionModal(new Date().toJSON()),
    []
  );

  const writable = props.writable ?? true;
  const multiple = props.multiple ?? false;
  const [tab, setTab] = useState<PrecisionTabId>('dispositifs');
  const [showAllMechanisms, setShowAllMechanisms] = useState(false);
  const [showAllBlockingPoints, setShowAllBlockingPoints] = useState(false);
  const [showAllEvolutions, setShowAllEvolutions] = useState(false);

  const { data: referential } = useFindPrecisionsQuery();
  const precisionOptions: ReadonlyArray<Precision> = referential ?? [];
  const precisions = props.value;

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

  function savePrecisions(precisions: ReadonlyArray<Precision>): void {
    if (writable) {
      props.onChange?.(precisions);
    }
    precisionModal.close();
  }

  return (
    <>
      <Stack spacing="1rem">
        <Typography component="h3" variant="h6">
          {multiple
            ? 'Précisions sur ces logements'
            : 'Précisions sur ce logement'}
        </Typography>
        {multiple ? (
          <Alert
            severity="info"
            small
            description="Si des logements sélectionnés ont déjà des dispositifs ou des points de blocage de renseignés, ceux-ci seront conservés."
          />
        ) : null}

        <Grid
          component="article"
          container
          sx={{ alignItems: 'center', columnGap: 2, rowGap: 1 }}
          size={12}
        >
          <Grid
            sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
            size={12}
          >
            <Typography
              component="h3"
              sx={{
                display: 'inline-block',
                fontSize: '1.125rem',
                fontWeight: 700
              }}
            >
              Points de blocage ({totalBlockingPoints})
            </Typography>
            {writable ? (
              <Button
                priority="secondary"
                title="Modifier les points de blocage"
                nativeButtonProps={{
                  'aria-label': 'Modifier les points de blocage'
                }}
                onClick={() => {
                  setTab('points-de-blocage');
                  precisionModal.open();
                }}
              >
                Modifier
              </Button>
            ) : null}
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
          size={12}
        >
          <Grid
            sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
            size={12}
          >
            <Typography
              component="h3"
              sx={{ fontSize: '1.125rem', fontWeight: 700 }}
            >
              Évolutions du logement ({totalEvolutions})
            </Typography>
            {writable ? (
              <Button
                priority="secondary"
                title="Modifier les évolutions"
                nativeButtonProps={{
                  'aria-label': 'Modifier les évolutions'
                }}
                onClick={() => {
                  setTab('evolutions');
                  precisionModal.open();
                }}
              >
                Modifier
              </Button>
            ) : null}
          </Grid>

          <Grid>
            {filteredEvolutions.length === 0 ? (
              <Typography>Aucune évolution</Typography>
            ) : (
              filteredEvolutions.map((precision) => (
                <Tag key={precision.id} className={styles.tag}>
                  {precision.category[0].toUpperCase() +
                    precision.category.substring(1).replace('-', ' ')}
                  &nbsp;:&nbsp;
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

        <Grid
          component="article"
          container
          sx={{ alignItems: 'center', columnGap: 2, rowGap: 1 }}
          size={12}
        >
          <Grid
            sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
            size={12}
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

            {writable ? (
              <Button
                priority="secondary"
                title="Modifier les dispositifs"
                nativeButtonProps={{
                  'aria-label': 'Modifier les dispositifs'
                }}
                onClick={() => {
                  setTab('dispositifs');
                  precisionModal.open();
                }}
              >
                Modifier
              </Button>
            ) : null}
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
      </Stack>
      <precisionModal.Component
        tab={tab}
        options={precisionOptions}
        showNullOption={props.showNullOption}
        value={precisions}
        onSubmit={savePrecisions}
        onTabChange={setTab}
      />
    </>
  );
}

export default PrecisionLists;
