import Tabs from '@codegouvfr/react-dsfr/Tabs';
import Grid from '@mui/material/Grid';

import type { Precision, PrecisionCategory } from '@zerologementvacant/models';
import { List } from 'immutable';
import type { ReactElement } from 'react';
import { useMemo } from 'react';
import PrecisionColumn from './PrecisionColumn';

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

  function handleCheckboxChange(precisions: Precision[]) {
    props.onChange(precisions);
  }

  function handleRadioChange(category: PrecisionCategory) {
    return (precision: Precision | null) => {
      const others = props.value.filter(
        (precision) => precision.category !== category
      );
      props.onChange(precision ? [...others, precision] : others);
    };
  }

  function getRadioValue(category: PrecisionCategory): Precision | null {
    return (
      props.value.find((precision) => precision.category === category) ?? null
    );
  }

  const MechanismsTab: PrecisionTab = {
    label: 'Dispositifs',
    tabId: 'dispositifs',
    children: (
      <Grid container columnSpacing={2}>
        <Grid size={4}>
          <PrecisionColumn
            category="dispositifs-incitatifs"
            icon="fr-icon-money-euro-circle-line"
            options={
              optionsByCategory.get('dispositifs-incitatifs')?.toArray() ?? []
            }
            title="Dispositifs incitatifs"
            value={props.value}
            onChange={handleCheckboxChange}
          />
        </Grid>

        <Grid size={4}>
          <PrecisionColumn
            category="dispositifs-coercitifs"
            icon="fr-icon-scales-3-line"
            options={
              optionsByCategory.get('dispositifs-coercitifs')?.toArray() ?? []
            }
            title="Dispositifs coercitifs"
            value={props.value}
            onChange={handleCheckboxChange}
          />
        </Grid>

        <Grid size={4}>
          <PrecisionColumn
            category="hors-dispositif-public"
            icon="fr-icon-more-line"
            options={
              optionsByCategory.get('hors-dispositif-public')?.toArray() ?? []
            }
            title="Hors dispositif public"
            value={props.value}
            onChange={handleCheckboxChange}
          />
        </Grid>
      </Grid>
    )
  };

  const BlockingPointsTab: PrecisionTab = {
    label: 'Points de blocage',
    tabId: 'points-de-blocage',
    children: (
      <Grid container columnSpacing={2}>
        <Grid size={3}>
          <PrecisionColumn
            category="blocage-involontaire"
            icon="fr-icon-close-circle-line"
            options={
              optionsByCategory.get('blocage-involontaire')?.toArray() ?? []
            }
            title="Blocage involontaire"
            value={props.value}
            onChange={handleCheckboxChange}
          />
        </Grid>

        <Grid size={3}>
          <PrecisionColumn
            category="blocage-volontaire"
            icon="fr-icon-close-circle-fill"
            options={
              optionsByCategory.get('blocage-volontaire')?.toArray() ?? []
            }
            title="Blocage volontaire"
            value={props.value}
            onChange={handleCheckboxChange}
          />
        </Grid>

        <Grid size={3}>
          <PrecisionColumn
            category="immeuble-environnement"
            icon="fr-icon-building-line"
            options={
              optionsByCategory.get('immeuble-environnement')?.toArray() ?? []
            }
            title="Immeuble / Environnement"
            value={props.value}
            onChange={handleCheckboxChange}
          />
        </Grid>

        <Grid size={3}>
          <PrecisionColumn
            category="tiers-en-cause"
            icon="ri-exchange-2-line"
            options={optionsByCategory.get('tiers-en-cause')?.toArray() ?? []}
            title="Tiers en cause"
            value={props.value}
            onChange={handleCheckboxChange}
          />
        </Grid>
      </Grid>
    )
  };

  const EvolutionsTab: PrecisionTab = {
    label: 'Évolutions',
    tabId: 'evolutions',
    children: (
      <Grid container columnSpacing={2}>
        <Grid size={4}>
          <PrecisionColumn
            category="travaux"
            icon="ri-barricade-line"
            input="radio"
            options={optionsByCategory.get('travaux')?.toArray() ?? []}
            title="Travaux"
            value={getRadioValue('travaux')}
            onChange={handleRadioChange('travaux')}
          />
        </Grid>

        <Grid size={4}>
          <PrecisionColumn
            category="occupation"
            icon="ri-user-location-line"
            input="radio"
            options={optionsByCategory.get('occupation')?.toArray() ?? []}
            title="Location ou autre occupation"
            value={getRadioValue('occupation')}
            onChange={handleRadioChange('occupation')}
          />
        </Grid>

        <Grid size={4}>
          <PrecisionColumn
            category="mutation"
            icon="ri-user-shared-line"
            input="radio"
            options={optionsByCategory.get('mutation')?.toArray() ?? []}
            title="Vente ou autre mutation"
            value={getRadioValue('mutation')}
            onChange={handleRadioChange('mutation')}
          />
        </Grid>
      </Grid>
    )
  };

  const tabs: PrecisionTab[] = [
    MechanismsTab,
    BlockingPointsTab,
    EvolutionsTab
  ];

  const tab = props.tab ?? 'evolutions';
  const activeTab = tabs.find((t) => t.tabId === tab) ?? tabs[0];

  return (
    <Tabs
      tabs={tabs}
      selectedTabId={tab}
      onTabChange={(tabId) => props.onTabChange(tabId as PrecisionTabId)}
    >
      {activeTab.children}
    </Tabs>
  );
}

export default PrecisionTabs;
