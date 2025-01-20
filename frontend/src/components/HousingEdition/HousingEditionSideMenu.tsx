import Button from '@codegouvfr/react-dsfr/Button';
import Tabs, { TabsProps } from '@codegouvfr/react-dsfr/Tabs';
import Tag from '@codegouvfr/react-dsfr/Tag';
import { yupResolver } from '@hookform/resolvers/yup';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { FormProvider, useForm } from 'react-hook-form';
import { ElementOf } from 'ts-essentials';
import * as yup from 'yup';

import {
  HOUSING_STATUS_VALUES,
  HousingStatus,
  Occupancy,
  OCCUPANCY_VALUES,
  PRECISION_MECHANISM_CATEGORY_VALUES,
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
import { getSubStatusOptions } from '../../models/HousingState';

interface HousingEditionSideMenuProps {
  housing?: Housing;
  expand: boolean;
  onSubmit: (housing: Housing, housingUpdate: HousingUpdate) => void;
  onClose: () => void;
}

const WIDTH = '700px';

const schema = yup.object({
  occupancy: yup
    .string()
    .required('Veuillez renseigner l’occupation actuelle')
    .oneOf(OCCUPANCY_VALUES),
  occupancyIntented: yup
    .string()
    .required('Veuillez renseigner l’occupation prévisionnelle')
    .oneOf(OCCUPANCY_VALUES),
  status: yup
    .number()
    .required('Veuillez renseigner le statut de suivi')
    .oneOf(HOUSING_STATUS_VALUES)
});

function HousingEditionSideMenu(props: HousingEditionSideMenuProps) {
  const form = useForm<yup.InferType<typeof schema>>({
    values: {
      occupancy: props.housing?.occupancy ?? Occupancy.UNKNOWN,
      occupancyIntented: props.housing?.occupancyIntended ?? Occupancy.UNKNOWN,
      status: props.housing?.status ?? HousingStatus.NEVER_CONTACTED
    },
    mode: 'onSubmit',
    resolver: yupResolver(schema)
  });

  const { housing, expand, onSubmit, onClose } = props;

  // TODO
  function submit() {
    if (housing) {
      onSubmit(housing, form.getValues() as HousingUpdate);
    }
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
    const status = form.watch('status');
    // TODO: fetch `GET /precisions`
    const precisions: ReadonlyArray<PrecisionCategory> = [];
    const mechanisms = precisions.filter((precision) =>
      PRECISION_MECHANISM_CATEGORY_VALUES.includes(precision)
    );

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
              selected={status}
              message={form.getFieldState('status').error?.message}
              messageType={
                form.getFieldState('status').invalid ? 'error' : 'default'
              }
              options={statusOptions()}
              onChange={(status) => {
                form.setValue('status', status);
              }}
            />
            <AppSelectNext
              disabled={getSubStatusOptions(status) === undefined}
              label="Sous-statut de suivi"
              name="subStatus"
              multiple={false}
              options={getSubStatusOptions(status) ?? []}
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
                Dispositifs ({mechanisms.length})
              </Typography>
              <Button priority="secondary" title="Modifier les dispositifs">
                Modifier
              </Button>
            </Grid>
            <Grid>
              <Tag>Ma Prime Renov’</Tag>
              <Tag>Aides aux travaux</Tag>
            </Grid>
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
                Points de blocages (0)
              </Typography>
              <Button
                priority="secondary"
                title="Modifier les points de blocage"
              >
                Modifier
              </Button>
            </Grid>
            <Grid>Badges</Grid>
          </Grid>

          <Grid
            component="article"
            container
            sx={{ alignItems: 'center', columnGap: 2 }}
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
                Évolutions du logement (1)
              </Typography>
              <Button
                priority="secondary"
                title="Modifier les évolutions du logement"
              >
                Modifier
              </Button>
            </Grid>
            <Grid>
              <Tag>Travaux : en cours</Tag>
            </Grid>
          </Grid>
        </Grid>
      ),
      label: 'Mobilisation'
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
          <Tabs tabs={[OccupationTab(), MobilisationTab()]} />
        </FormProvider>
      }
      open={expand}
      onClose={onClose}
      onSave={form.handleSubmit(submit)}
    />
  );
}

export default HousingEditionSideMenu;
