import Tabs, { TabsProps } from '@codegouvfr/react-dsfr/Tabs';
import { yupResolver } from '@hookform/resolvers/yup';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { FormProvider, useForm } from 'react-hook-form';
import { ElementOf } from 'ts-essentials';
import * as yup from 'yup';

import { Occupancy, OCCUPANCY_VALUES } from '@zerologementvacant/models';
import { Housing, HousingUpdate } from '../../models/Housing';
import AppLink from '../_app/AppLink/AppLink';
import AsideNext from '../Aside/AsideNext';
import LabelNext from '../Label/LabelNext';
import AppSelectNext from '../_app/AppSelect/AppSelectNext';
import { allOccupancyOptions } from '../../models/HousingFilters';

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
    .oneOf(OCCUPANCY_VALUES)
});

function HousingEditionSideMenu(props: HousingEditionSideMenuProps) {
  const form = useForm<yup.InferType<typeof schema>>({
    values: {
      occupancy: props.housing?.occupancy ?? Occupancy.UNKNOWN,
      occupancyIntented: props.housing?.occupancyIntended ?? Occupancy.UNKNOWN
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

  return (
    <FormProvider {...form}>
      <form id="aside-form" onSubmit={form.handleSubmit(submit)}>
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
          main={<Tabs tabs={[OccupationTab()]} />}
          open={expand}
          onClose={onClose}
          onSave={form.handleSubmit(submit)}
        />
      </form>
    </FormProvider>
  );
}

export default HousingEditionSideMenu;
