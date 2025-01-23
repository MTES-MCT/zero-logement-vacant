import { fr } from '@codegouvfr/react-dsfr';
import Checkbox, { CheckboxProps } from '@codegouvfr/react-dsfr/Checkbox';
import Tabs, { TabsProps } from '@codegouvfr/react-dsfr/Tabs';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import { List } from 'immutable';
import { ChangeEvent, useMemo } from 'react';
import { ElementOf } from 'ts-essentials';

import { Precision } from '@zerologementvacant/models';

interface PrecisionTabs {
  defaultTab?: TabId;
  options: Precision[];
  value: Precision[];
  onChange(value: Precision[]): void;
}

type TabId = 'dispositifs' | 'points-de-blocage' | 'evolutions';
type Tab = ElementOf<TabsProps.Uncontrolled['tabs']>;

function PrecisionTabs(props: PrecisionTabs) {
  const optionsByCategory = useMemo(
    () => List(props.options).groupBy((option) => option.category),
    [props.options]
  );

  const defaultTab = props.defaultTab ?? 'dispositifs';
  const isDefault = (tab: TabId) => tab === defaultTab;

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.checked) {
      const precision = props.options.find(
        (option) => option.id === event.target.value
      );
      props.onChange([...props.value, precision as Precision]);
    } else {
      props.onChange(
        props.value.filter((precision) => precision.id !== event.target.value)
      );
    }
  }

  function MechanismsTab(): Tab {
    return {
      label: 'Dispositifs',
      isDefault: isDefault('dispositifs'),
      content: (
        <Grid container columnSpacing={2}>
          <Grid xs={4}>
            <Typography sx={{ fontWeight: 700, lineHeight: '1.5rem', mb: 2 }}>
              <span
                className={fr.cx('fr-icon-money-euro-circle-line', 'fr-mr-1w')}
              />
              Dispositifs incitatifs
            </Typography>
            <Checkbox
              options={optionsByCategory.get('dispositifs-incitatifs')?.map(
                (option): ElementOf<CheckboxProps['options']> => ({
                  label: option.label,
                  nativeInputProps: {
                    checked: props.value.some(
                      (value) => value.id === option.id
                    ),
                    value: option.id,
                    onChange: onChange
                  }
                })
              )}
            />
          </Grid>

          <Grid xs={4}>
            <Typography sx={{ fontWeight: 700, lineHeight: '1.5rem', mb: 2 }}>
              <span className={fr.cx('fr-icon-scales-3-line', 'fr-mr-1w')} />
              Dispositifs coercitifs
            </Typography>
          </Grid>

          <Grid xs={4}>
            <Typography sx={{ fontWeight: 700, lineHeight: '1.5rem', mb: 2 }}>
              <span className={fr.cx('fr-icon-more-line', 'fr-mr-1w')} />
              Hors dispositif public
            </Typography>
          </Grid>
        </Grid>
      )
    };
  }

  const tabs: TabsProps.Uncontrolled['tabs'] = [MechanismsTab()];

  return <Tabs tabs={tabs} />;
}

export default PrecisionTabs;
