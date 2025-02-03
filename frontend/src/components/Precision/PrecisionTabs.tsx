import { fr, FrIconClassName, RiIconClassName } from '@codegouvfr/react-dsfr';
import Checkbox, { CheckboxProps } from '@codegouvfr/react-dsfr/Checkbox';
import RadioButtons from '@codegouvfr/react-dsfr/RadioButtons';
import Tabs from '@codegouvfr/react-dsfr/Tabs';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import { List } from 'immutable';
import { ChangeEvent, ReactElement, useMemo } from 'react';
import { ElementOf } from 'ts-essentials';
import styles from './precision-modal.module.scss';

import { Precision, PrecisionCategory } from '@zerologementvacant/models';
import classNames from 'classnames';

interface PrecisionTabs {
  tab: PrecisionTabId;
  options: Precision[];
  value: Precision[];
  onChange(value: Precision[]): void;
  onTabChange(tab: PrecisionTabId): void;
}

export type PrecisionTabId = 'dispositifs' | 'points-de-blocage' | 'evolutions';
export type PrecisionTab = {
  tabId: PrecisionTabId;
  label: string;
  children: ReactElement;
};

function PrecisionTabs(props: PrecisionTabs) {
  const optionsByCategory = useMemo(
    () => List(props.options).groupBy((option) => option.category),
    [props.options]
  );

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.checked) {
      const option = props.options.find(
        (option) => option.id === event.target.value
      ) as Precision;

      if (event.target.type === 'radio') {
        props.onChange(
          props.value
            // Remove mutually exclusive options
            .filter((selected) => selected.category !== option.category)
            .concat(option)
        );
      } else {
        props.onChange([...props.value, option as Precision]);
      }
    } else {
      props.onChange(
        props.value.filter((precision) => precision.id !== event.target.value)
      );
    }
  }

  interface PrecisionColumnProps {
    category: PrecisionCategory;
    icon: FrIconClassName | RiIconClassName;
    title: string;
    /**
     * @default 'checkbox'
     */
    input?: 'checkbox' | 'radio';
  }

  function PrecisionColumn(columnProps: PrecisionColumnProps) {
    const Fieldset = columnProps.input === 'radio' ? RadioButtons : Checkbox;

    return (
      <>
        <Typography sx={{ fontWeight: 700, lineHeight: '1.5rem', mb: 2 }}>
          <span
            className={classNames(
              fr.cx(columnProps.icon, 'fr-mr-1w'),
              styles.icon
            )}
          />
          {columnProps.title}
        </Typography>
        <Fieldset
          options={optionsByCategory.get(columnProps.category)?.map(
            (option): ElementOf<CheckboxProps['options']> => ({
              label: option.label,
              nativeInputProps: {
                checked: props.value.some((value) => value.id === option.id),
                value: option.id,
                onChange: onChange
              }
            })
          )}
        />
      </>
    );
  }

  function MechanismsTab(): PrecisionTab {
    return {
      label: 'Dispositifs',
      tabId: 'dispositifs',
      children: (
        <Grid container columnSpacing={2}>
          <Grid xs={4}>
            <PrecisionColumn
              category="dispositifs-incitatifs"
              icon="fr-icon-money-euro-circle-line"
              title="Dispositifs incitatifs"
            />
          </Grid>

          <Grid xs={4}>
            <PrecisionColumn
              category="dispositifs-coercitifs"
              icon="fr-icon-scales-3-line"
              title="Dispositifs coercitifs"
            />
          </Grid>

          <Grid xs={4}>
            <PrecisionColumn
              category="hors-dispositif-public"
              icon="fr-icon-more-line"
              title="Hors dispositif public"
            />
          </Grid>
        </Grid>
      )
    };
  }

  function BlockingPointsTab(): PrecisionTab {
    return {
      label: 'Points de blocage',
      tabId: 'points-de-blocage',
      children: (
        <Grid container columnSpacing={2}>
          <Grid xs={3}>
            <PrecisionColumn
              category="blocage-involontaire"
              icon="fr-icon-close-circle-line"
              title="Blocage involontaire"
            />
          </Grid>

          <Grid xs={3}>
            <PrecisionColumn
              category="blocage-volontaire"
              icon="fr-icon-close-circle-fill"
              title="Blocage volontaire"
            />
          </Grid>

          <Grid xs={3}>
            <PrecisionColumn
              category="immeuble-environnement"
              icon="fr-icon-building-line"
              title="Immeuble / Environnement"
            />
          </Grid>

          <Grid xs={3}>
            <PrecisionColumn
              category="tiers-en-cause"
              icon="ri-exchange-2-line"
              title="Tiers en cause"
            />
          </Grid>
        </Grid>
      )
    };
  }

  function EvolutionsTab(): PrecisionTab {
    return {
      label: 'Évolutions',
      tabId: 'evolutions',
      children: (
        <Grid container columnSpacing={2}>
          <Grid xs={4}>
            <PrecisionColumn
              category="travaux"
              icon="ri-barricade-line"
              input="radio"
              title="Travaux"
            />
          </Grid>

          <Grid xs={4}>
            <PrecisionColumn
              category="occupation"
              icon="ri-user-location-line"
              input="radio"
              title="Location ou autre occupation"
            />
          </Grid>

          <Grid xs={4}>
            <PrecisionColumn
              category="mutation"
              icon="ri-user-shared-line"
              input="radio"
              title="Vente ou autre mutation"
            />
          </Grid>
        </Grid>
      )
    };
  }

  const tabs: PrecisionTab[] = [
    MechanismsTab(),
    BlockingPointsTab(),
    EvolutionsTab()
  ];

  const tab = props.tab ?? 'dispositifs';
  const activeTab = tabs.find((t) => t.tabId === tab) ?? tabs[0];

  return (
    <Tabs tabs={tabs} selectedTabId={tab} onTabChange={props.onTabChange}>
      {activeTab.children}
    </Tabs>
  );
}

export default PrecisionTabs;
